/*
  # Update transactions to use category_type

  1. Changes
    - Add category_type column
    - Make category_type required
    - Add index for better performance
*/

-- Add category_type column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'category_type'
  ) THEN
    ALTER TABLE transactions
    ADD COLUMN category_type text;
  END IF;
END $$;

-- Make category_type required
ALTER TABLE transactions
ALTER COLUMN category_type SET NOT NULL;

-- Create index for category_type
CREATE INDEX IF NOT EXISTS idx_transactions_category_type 
ON transactions(category_type);