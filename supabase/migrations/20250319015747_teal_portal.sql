/*
  # Cost Centers System Setup

  1. Changes
    - Create cost_centers table
    - Add proper constraints and indexes
    - Enable RLS with appropriate policies
    - Add updated_at trigger
    - Remove automatic cost center creation

  2. Security
    - Drop existing policies to avoid conflicts
    - Recreate policies with proper permissions
*/

-- Create cost_centers table if not exists
CREATE TABLE IF NOT EXISTS cost_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  active boolean DEFAULT true,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON cost_centers;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON cost_centers;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON cost_centers;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON cost_centers;

-- Create policies
CREATE POLICY "Enable read access for authenticated users"
  ON cost_centers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON cost_centers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users based on user_id"
  ON cost_centers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id"
  ON cost_centers
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cost_centers_user_id ON cost_centers(user_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_active ON cost_centers(active);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS set_updated_at_cost_centers ON cost_centers;
CREATE TRIGGER set_updated_at_cost_centers
  BEFORE UPDATE ON cost_centers
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();