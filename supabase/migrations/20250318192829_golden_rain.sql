/*
  # Add reconciled column to transactions table

  1. Changes
    - Add reconciled column to transactions table
    - Set default value to false
    - Add index for better query performance
*/

-- Add reconciled column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'reconciled'
  ) THEN
    ALTER TABLE transactions
    ADD COLUMN reconciled boolean DEFAULT false;
  END IF;
END $$;

-- Create index for reconciled status
CREATE INDEX IF NOT EXISTS idx_transactions_reconciled 
ON transactions(reconciled);

-- Update existing completed transactions to be reconciled
UPDATE transactions
SET reconciled = true
WHERE status = 'completed';