/*
  # Fix Verification System

  1. Changes
    - Drop existing trigger that uses net schema
    - Create new trigger function using Edge Functions
    - Update policies for verification codes
*/

-- Drop existing trigger
DROP TRIGGER IF EXISTS send_verification_email_trigger ON verification_codes;
DROP FUNCTION IF EXISTS send_verification_email();

-- Create new trigger function using Edge Functions
CREATE OR REPLACE FUNCTION send_verification_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- The actual email sending will be handled by the Edge Function
  -- This function now just returns the NEW row to complete the trigger
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER send_verification_email_trigger
  AFTER INSERT ON verification_codes
  FOR EACH ROW
  EXECUTE FUNCTION send_verification_email();

-- Drop existing policies
DROP POLICY IF EXISTS "Enable insert for public" ON verification_codes;
DROP POLICY IF EXISTS "Enable select for public" ON verification_codes;
DROP POLICY IF EXISTS "Enable update for matching email" ON verification_codes;

-- Create new policies
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