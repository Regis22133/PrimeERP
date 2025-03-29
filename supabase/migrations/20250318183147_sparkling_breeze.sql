/*
  # Update transactions table to use category instead of category_type

  1. Changes
    - Rename category_type column to category
    - Update indexes
*/

-- Rename category_type to category
ALTER TABLE transactions
RENAME COLUMN category_type TO category;

-- Drop old index
DROP INDEX IF EXISTS idx_transactions_category_type;

-- Create new index
CREATE INDEX IF NOT EXISTS idx_transactions_category 
ON transactions(category);