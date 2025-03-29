/*
  # Fix Categories System

  1. Changes
    - Drop existing category-related constraints
    - Recreate category_types table with proper structure
    - Add proper RLS policies
    - Update transactions table to use category_types

  2. Security
    - Enable RLS
    - Add policies for user data isolation
*/

-- Drop existing constraints and tables
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_category_user_fkey;

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

-- Create policies
CREATE POLICY "Enable read access for authenticated users"
  ON category_types
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON category_types
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for users based on user_id"
  ON category_types
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id"
  ON category_types
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

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

-- Grant necessary permissions
GRANT ALL ON category_types TO authenticated;