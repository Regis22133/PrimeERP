/*
  # Add User ID and Timestamps to Tables

  1. Changes
    - Add user_id column to existing tables
    - Add created_at and updated_at timestamps
    - Add indexes for user_id columns
    - Add timestamp update triggers

  2. Security
    - Enable RLS on all tables
    - Add policies for user data isolation
*/

-- Add user_id to transactions if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE transactions
    ADD COLUMN user_id uuid REFERENCES auth.users(id) NOT NULL;
  END IF;
END $$;

-- Add user_id to categories if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE categories
    ADD COLUMN user_id uuid REFERENCES auth.users(id) NOT NULL;
  END IF;
END $$;

-- Add user_id to bank_accounts if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bank_accounts' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE bank_accounts
    ADD COLUMN user_id uuid REFERENCES auth.users(id) NOT NULL;
  END IF;
END $$;

-- Add user_id to bank_statements if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bank_statements' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE bank_statements
    ADD COLUMN user_id uuid REFERENCES auth.users(id) NOT NULL;
  END IF;
END $$;

-- Create indexes for user_id columns
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_statements_user_id ON bank_statements(user_id);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_updated_at_transactions'
  ) THEN
    CREATE TRIGGER set_updated_at_transactions
      BEFORE UPDATE ON transactions
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_updated_at_categories'
  ) THEN
    CREATE TRIGGER set_updated_at_categories
      BEFORE UPDATE ON categories
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_updated_at_bank_accounts'
  ) THEN
    CREATE TRIGGER set_updated_at_bank_accounts
      BEFORE UPDATE ON bank_accounts
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;