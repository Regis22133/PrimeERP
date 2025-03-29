/*
  # Update category types and transactions schema

  1. Changes
    - Create category_types table with proper constraints
    - Add unique constraint on name column
    - Enable RLS and add policies
    - Update transactions table to reference category_types
*/

-- Drop existing category_types table if exists
DROP TABLE IF EXISTS category_types CASCADE;

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

-- Add foreign key from transactions to category_types
ALTER TABLE transactions
ADD CONSTRAINT transactions_category_user_fkey
FOREIGN KEY (category, user_id) 
REFERENCES category_types(name, user_id)
ON UPDATE CASCADE;