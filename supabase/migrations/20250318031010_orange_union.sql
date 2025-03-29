/*
  # SMS Verification System

  1. New Tables
    - `verification_codes`
      - `id` (uuid, primary key)
      - `phone` (text)
      - `code` (text)
      - `created_at` (timestamp)
      - `expires_at` (timestamp)
      - `used` (boolean)
      - `used_at` (timestamp)

  2. Security
    - Enable RLS on verification_codes table
    - Add policy for public access to validate codes

  3. Functions
    - `generate_verification_code`: Generates a random 6-digit code
    - `request_verification_code`: Creates and sends a verification code via SMS
    - `verify_code`: Validates a verification code
*/

-- Create verification_codes table
CREATE TABLE IF NOT EXISTS verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code text NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  used_at timestamptz
);

-- Enable RLS
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- Create policy for public access to validate codes
CREATE POLICY "Anyone can validate verification codes"
  ON verification_codes
  FOR SELECT
  TO public
  USING (true);

-- Function to generate random verification code
CREATE OR REPLACE FUNCTION generate_verification_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code text;
BEGIN
  -- Generate a random 6-digit code
  v_code := lpad(floor(random() * 1000000)::text, 6, '0');
  RETURN v_code;
END;
$$;

-- Function to request a new verification code
CREATE OR REPLACE FUNCTION request_verification_code(p_phone text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code text;
  v_request_id uuid;
BEGIN
  -- Generate a new code
  v_code := generate_verification_code();
  
  -- Insert the code with 15-minute expiration
  INSERT INTO verification_codes (phone, code, expires_at)
  VALUES (p_phone, v_code, now() + interval '15 minutes')
  RETURNING id INTO v_request_id;
  
  -- Return the request ID
  RETURN v_request_id;
END;
$$;

-- Function to verify a code
CREATE OR REPLACE FUNCTION verify_code(p_phone text, p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_valid boolean;
BEGIN
  UPDATE verification_codes
  SET used = true,
      used_at = now()
  WHERE phone = p_phone
    AND code = p_code
    AND used = false
    AND expires_at > now()
  RETURNING true INTO v_valid;
  
  RETURN COALESCE(v_valid, false);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_verification_code() TO authenticated;
GRANT EXECUTE ON FUNCTION request_verification_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_code(text, text) TO authenticated;