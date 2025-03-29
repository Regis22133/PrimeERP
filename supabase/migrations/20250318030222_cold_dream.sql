/*
  # Add access code functions
  
  1. New Functions
    - `generate_access_code()`: Generates a random 8-character access code
    - `create_access_code(p_email text)`: Creates a new access code for a given email
    - `validate_access_code(p_code text, p_email text)`: Validates an access code
  
  2. Security
    - Functions are accessible to authenticated users only
    - Access codes are unique and case-sensitive
*/

-- Function to generate random access codes
CREATE OR REPLACE FUNCTION generate_access_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  chars text[] := ARRAY['A','B','C','D','E','F','G','H','J','K','L','M','N','P','Q','R','S','T','U','V','W','X','Y','Z','2','3','4','5','6','7','8','9'];
  result text := '';
  i integer := 0;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || chars[1 + floor(random() * array_length(chars, 1))];
  END LOOP;
  RETURN result;
END;
$$;

-- Function to create a new access code
CREATE OR REPLACE FUNCTION create_access_code(p_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code text;
BEGIN
  -- Generate a unique code
  LOOP
    v_code := generate_access_code();
    BEGIN
      INSERT INTO access_codes (code, email)
      VALUES (v_code, p_email);
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      -- If code already exists, try again
      CONTINUE;
    END;
  END LOOP;
  
  RETURN v_code;
END;
$$;

-- Function to validate an access code
CREATE OR REPLACE FUNCTION validate_access_code(p_code text, p_email text)
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
GRANT EXECUTE ON FUNCTION generate_access_code() TO authenticated;
GRANT EXECUTE ON FUNCTION create_access_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_access_code(text, text) TO authenticated;