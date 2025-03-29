/*
  # Access Code Functions Implementation

  1. Functions
    - `request_access_code`: Creates a new access code for a user
    - `check_access_code`: Validates an access code for signup

  This migration adds functions to handle access code generation and validation,
  building on top of the existing access_codes table and policies.
*/

-- Function to request a new access code
CREATE OR REPLACE FUNCTION request_access_code(p_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code text;
  v_request_id uuid;
BEGIN
  -- Generate a random 8-character code
  v_code := upper(substring(encode(gen_random_bytes(6), 'hex') from 1 for 8));
  
  -- Create new access code
  INSERT INTO access_codes (code, email)
  VALUES (v_code, p_email);
  
  -- Return a request ID (for tracking purposes)
  v_request_id := gen_random_uuid();
  RETURN v_request_id;
END;
$$;

-- Function to check access code
CREATE OR REPLACE FUNCTION check_access_code(p_email text, p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_valid boolean;
BEGIN
  UPDATE access_codes
  SET used = true,
      used_at = now()
  WHERE code = p_code
    AND email = p_email
    AND used = false
  RETURNING true INTO v_valid;
  
  RETURN COALESCE(v_valid, false);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION request_access_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION check_access_code(text, text) TO authenticated;