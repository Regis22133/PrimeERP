/*
  # Fix Verification Codes RLS Policies

  1. Changes
    - Drop existing policies
    - Enable RLS on verification_codes table
    - Add proper policies for public access
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can validate verification codes" ON verification_codes;

-- Enable RLS
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Enable insert for public"
  ON verification_codes
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Enable select for public"
  ON verification_codes
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable update for matching email"
  ON verification_codes
  FOR UPDATE
  TO public
  USING (email = current_setting('request.jwt.claims')::json->>'email')
  WITH CHECK (email = current_setting('request.jwt.claims')::json->>'email');

-- Grant necessary permissions
GRANT INSERT, SELECT, UPDATE ON verification_codes TO public;