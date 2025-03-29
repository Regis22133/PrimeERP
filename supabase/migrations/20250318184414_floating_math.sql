/*
  # Fix Category Types and Transactions

  1. Changes
    - Drop existing constraints and tables
    - Recreate category_types with proper structure
    - Update transactions table
    - Add proper foreign key relationships
    - Add RLS policies
*/

-- Drop existing constraints
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_category_user_fkey;

-- Drop existing tables
DROP TABLE IF EXISTS category_types CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- Create category_types table
CREATE TABLE category_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE (name, user_id)
);

-- Enable RLS
ALTER TABLE category_types ENABLE ROW LEVEL SECURITY;

-- Create policy for category_types
CREATE POLICY "Users can manage their own category types"
  ON category_types
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_category_types_user_id 
ON category_types(user_id);

CREATE INDEX IF NOT EXISTS idx_category_types_name 
ON category_types(name);

-- Make sure transactions.category is NOT NULL
ALTER TABLE transactions
ALTER COLUMN category SET NOT NULL;

-- Add foreign key from transactions to category_types
ALTER TABLE transactions
ADD CONSTRAINT transactions_category_user_fkey
FOREIGN KEY (category, user_id) 
REFERENCES category_types(name, user_id)
ON UPDATE CASCADE;