/*
  # Add Cost Center to Transactions

  1. Changes
    - Add cost_center column to transactions table
    - Add index for better query performance
*/

-- Add cost_center column to transactions
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS cost_center text;

-- Create index for cost_center
CREATE INDEX IF NOT EXISTS idx_transactions_cost_center 
ON transactions(cost_center);