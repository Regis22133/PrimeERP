/*
  # Add Password Recovery Table

  1. New Tables
    - `password_recovery`
      - `id` (uuid, primary key)
      - `email` (text): User's email
      - `token` (text): Unique recovery token
      - `expires_at` (timestamptz): Token expiration timestamp
      - `used` (boolean): Whether token has been used
      - `used_at` (timestamptz): When token was used
      - `created_at` (timestamptz): Creation timestamp

  2. Security
    - Enable RLS
    - Add policies for secure access
    - Add indexes for better performance
*/

-- Create password_recovery table
CREATE TABLE IF NOT EXISTS password_recovery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT password_recovery_token_key UNIQUE (token)
);

-- Enable RLS
ALTER TABLE password_recovery ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable insert for public"
  ON password_recovery
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Enable select for public"
  ON password_recovery
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable update for matching email"
  ON password_recovery
  FOR UPDATE
  TO public
  USING (email = current_setting('request.jwt.claims')::json->>'email')
  WITH CHECK (email = current_setting('request.jwt.claims')::json->>'email');

-- Create indexes
CREATE INDEX idx_password_recovery_email ON password_recovery(email);
CREATE INDEX idx_password_recovery_token ON password_recovery(token);
CREATE INDEX idx_password_recovery_expires_at ON password_recovery(expires_at);
CREATE INDEX idx_password_recovery_used ON password_recovery(used);

-- Create function to generate secure token
CREATE OR REPLACE FUNCTION generate_recovery_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token text;
BEGIN
  -- Generate a random 32-byte token and encode it as hex
  v_token := encode(gen_random_bytes(32), 'hex');
  RETURN v_token;
END;
$$;

-- Create function to request password reset
CREATE OR REPLACE FUNCTION request_password_reset(p_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token text;
  v_id uuid;
BEGIN
  -- Generate token
  v_token := generate_recovery_token();
  
  -- Insert new recovery record
  INSERT INTO password_recovery (
    email,
    token,
    expires_at
  ) VALUES (
    p_email,
    v_token,
    now() + interval '1 hour'
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Create function to verify recovery token
CREATE OR REPLACE FUNCTION verify_recovery_token(p_email text, p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_valid boolean;
BEGIN
  UPDATE password_recovery
  SET 
    used = true,
    used_at = now()
  WHERE email = p_email
    AND token = p_token
    AND used = false
    AND expires_at > now()
  RETURNING true INTO v_valid;
  
  RETURN COALESCE(v_valid, false);
END;
$$;

-- Grant necessary permissions
GRANT ALL ON password_recovery TO authenticated;
GRANT EXECUTE ON FUNCTION generate_recovery_token() TO authenticated;
GRANT EXECUTE ON FUNCTION request_password_reset(text) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_recovery_token(text, text) TO authenticated;