/*
  # Fix Transactions Category Field

  1. Changes
    - Add category_type column to transactions table
    - Drop category_id foreign key constraint
    - Update existing transactions to use category_type
    - Drop category_id column
*/

-- Add new category_type column
ALTER TABLE transactions
ADD COLUMN category_type text;

-- Update existing transactions to use category_type from categories
DO $$
BEGIN
  UPDATE transactions t
  SET category_type = c.category_type
  FROM categories c
  WHERE t.category_id = c.id;
END $$;

-- Drop foreign key constraint
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS transactions_category_id_fkey;

-- Drop category_id column
ALTER TABLE transactions
DROP COLUMN category_id;

-- Make category_type required
ALTER TABLE transactions
ALTER COLUMN category_type SET NOT NULL;

-- Drop category_id index
DROP INDEX IF EXISTS idx_transactions_category_id;

-- Create index for category_type
CREATE INDEX IF NOT EXISTS idx_transactions_category_type 
ON transactions(category_type);