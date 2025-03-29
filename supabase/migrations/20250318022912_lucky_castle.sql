/*
  # Add Access Codes System

  1. New Tables
    - `access_codes`
      - `code` (text, primary key) - Unique access code
      - `email` (text) - Associated email
      - `used` (boolean) - Whether the code has been used
      - `created_at` (timestamp)
      - `used_at` (timestamp) - When the code was used

  2. Changes
    - Add access_code field to profiles table
    - Add validation trigger for access codes

  3. Security
    - Enable RLS on access_codes table
    - Add policies for access code validation
*/

-- Create access_codes table
CREATE TABLE IF NOT EXISTS public.access_codes (
  code text PRIMARY KEY,
  email text,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  used_at timestamptz
);

-- Add access_code to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS access_code text REFERENCES access_codes(code);

-- Enable RLS
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;

-- Create policy for access codes
CREATE POLICY "Anyone can validate access codes"
  ON access_codes
  FOR SELECT
  TO public
  USING (true);

-- Create function to validate access code
CREATE OR REPLACE FUNCTION validate_access_code(p_code text, p_email text)
RETURNS boolean AS $$
DECLARE
  v_valid boolean;
BEGIN
  UPDATE access_codes
  SET used = true,
      email = p_email,
      used_at = now()
  WHERE code = p_code
    AND (email IS NULL OR email = p_email)
    AND used = false
  RETURNING true INTO v_valid;
  
  RETURN COALESCE(v_valid, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;