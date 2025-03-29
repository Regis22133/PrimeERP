/*
  # Fix transactions table structure

  1. Changes
    - Drop category_id column and its references
    - Add category_type column
    - Update constraints and indexes
*/

-- Drop category_id constraint if exists
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS transactions_category_id_fkey;

-- Drop category_id column if exists
ALTER TABLE transactions
DROP COLUMN IF EXISTS category_id;

-- Add category_type column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'category_type'
  ) THEN
    ALTER TABLE transactions
    ADD COLUMN category_type text NOT NULL;
  END IF;
END $$;

-- Create index for category_type
CREATE INDEX IF NOT EXISTS idx_transactions_category_type 
ON transactions(category_type);

-- Drop old index if exists
DROP INDEX IF EXISTS idx_transactions_category_id;