/*
  # Add email trigger for verification codes

  1. Changes
    - Add trigger function to send verification emails
    - Add trigger to verification_codes table
*/

-- Function to send verification email
CREATE OR REPLACE FUNCTION send_verification_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Call Edge Function to send email
  PERFORM
    net.http_post(
      url := current_setting('app.settings.edge_function_url') || '/send-verification',
      body := json_build_object(
        'email', NEW.email,
        'code', NEW.code
      )::text
    );
  
  RETURN NEW;
END;
$$;

-- Add trigger to send email when code is created
DROP TRIGGER IF EXISTS send_verification_email_trigger ON verification_codes;
CREATE TRIGGER send_verification_email_trigger
  AFTER INSERT ON verification_codes
  FOR EACH ROW
  EXECUTE FUNCTION send_verification_email();