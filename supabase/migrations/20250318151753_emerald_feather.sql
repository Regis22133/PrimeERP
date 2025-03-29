/*
  # Fix transactions table structure

  1. Changes
    - Add proper constraints
    - Fix column types
    - Add indexes
*/

-- Add proper constraints to transactions table
ALTER TABLE transactions
ALTER COLUMN description SET NOT NULL,
ALTER COLUMN amount SET NOT NULL,
ALTER COLUMN competence_date SET NOT NULL,
ALTER COLUMN due_date SET NOT NULL,
ALTER COLUMN status SET NOT NULL,
ALTER COLUMN category_id SET NOT NULL,
ALTER COLUMN bank_account SET NOT NULL;

-- Add check constraint for amount
ALTER TABLE transactions
ADD CONSTRAINT transactions_amount_check 
CHECK (amount > 0);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_category_id 
ON transactions(category_id);

CREATE INDEX IF NOT EXISTS idx_transactions_bank_account 
ON transactions(bank_account);

CREATE INDEX IF NOT EXISTS idx_transactions_status 
ON transactions(status);

-- Add composite index for date range queries
CREATE INDEX IF NOT EXISTS idx_transactions_dates 
ON transactions(competence_date, due_date);