/*
  # Initial Schema Setup

  1. Tables
    - users (managed by Supabase Auth)
    - transactions
    - categories
    - category_types

  2. Security
    - Enable RLS on all tables
    - Set up policies for authenticated users
*/

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  parent_id uuid REFERENCES categories(id),
  dre_group text NOT NULL,
  category_type text,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Category Types Table
CREATE TABLE IF NOT EXISTS category_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  description text NOT NULL,
  amount decimal(12,2) NOT NULL,
  category_id uuid REFERENCES categories(id),
  competence_date date NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'completed')),
  invoice_number text,
  bank_account text,
  supplier text,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policies for categories
CREATE POLICY "Users can manage their own categories"
  ON categories
  USING (auth.uid() = user_id);

-- Policies for category_types
CREATE POLICY "Users can manage their own category types"
  ON category_types
  USING (auth.uid() = user_id);

-- Policies for transactions
CREATE POLICY "Users can manage their own transactions"
  ON transactions
  USING (auth.uid() = user_id);

-- Updated trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
CREATE TRIGGER set_updated_at_categories
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_transactions
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_category_types_user_id ON category_types(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_competence_date ON transactions(competence_date);
CREATE INDEX IF NOT EXISTS idx_transactions_due_date ON transactions(due_date);