/*
  # Add Primary Account Flag

  1. Changes
    - Add isPrimary column to bank_accounts table
    - Add constraint to ensure only one primary account per user
    - Add function to handle primary account changes
*/

-- Add isPrimary column
ALTER TABLE bank_accounts
ADD COLUMN is_primary boolean DEFAULT false;

-- Create function to ensure only one primary account per user
CREATE OR REPLACE FUNCTION handle_primary_account()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary THEN
    UPDATE bank_accounts
    SET is_primary = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for primary account handling
CREATE TRIGGER handle_primary_account_trigger
  BEFORE INSERT OR UPDATE ON bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION handle_primary_account();

-- Create index for faster lookups
CREATE INDEX idx_bank_accounts_is_primary ON bank_accounts(is_primary);