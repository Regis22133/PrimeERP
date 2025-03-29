/*
  # Cost Centers Implementation

  1. Changes
    - Drop existing objects to ensure clean slate
    - Create cost_centers table
    - Add RLS policies
    - Add triggers and functions
    - Insert default data
*/

-- Drop existing objects
DROP TABLE IF EXISTS cost_centers CASCADE;
DROP FUNCTION IF EXISTS insert_default_cost_centers(uuid) CASCADE;
DROP FUNCTION IF EXISTS handle_new_user_cost_centers() CASCADE;

-- Create cost_centers table
CREATE TABLE cost_centers (
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

-- Drop existing policies if they exist
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
CREATE INDEX idx_cost_centers_user_id ON cost_centers(user_id);
CREATE INDEX idx_cost_centers_active ON cost_centers(active);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS set_updated_at_cost_centers ON cost_centers;
CREATE TRIGGER set_updated_at_cost_centers
  BEFORE UPDATE ON cost_centers
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Add default cost centers function
CREATE OR REPLACE FUNCTION insert_default_cost_centers(p_user_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO cost_centers (name, description, user_id)
  VALUES
    ('Administrativo', 'Custos administrativos gerais', p_user_id),
    ('Comercial', 'Custos relacionados a vendas e marketing', p_user_id),
    ('Financeiro', 'Custos do departamento financeiro', p_user_id),
    ('Marketing', 'Custos de marketing e publicidade', p_user_id),
    ('Operacional', 'Custos operacionais', p_user_id),
    ('Recursos Humanos', 'Custos de RH e pessoal', p_user_id),
    ('TI', 'Custos de tecnologia e sistemas', p_user_id)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function for new users
CREATE OR REPLACE FUNCTION handle_new_user_cost_centers()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM insert_default_cost_centers(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created_cost_centers ON auth.users;
CREATE TRIGGER on_auth_user_created_cost_centers
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_cost_centers();

-- Insert default cost centers for existing users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM auth.users LOOP
    PERFORM insert_default_cost_centers(user_record.id);
  END LOOP;
END $$;