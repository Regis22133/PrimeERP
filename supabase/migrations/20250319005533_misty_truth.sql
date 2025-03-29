/*
  # Fix DRE Groups Table and Relations

  1. Changes
    - Drop existing dre_groups table if exists
    - Create dre_groups table with proper constraints
    - Add RLS policies
    - Add trigger for new users
    - Insert default groups for existing users
*/

-- Drop existing table if exists
DROP TABLE IF EXISTS dre_groups CASCADE;

-- Create dre_groups table
CREATE TABLE dre_groups (
  id text NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  "order" integer NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id, user_id)
);

-- Enable RLS on dre_groups
ALTER TABLE dre_groups ENABLE ROW LEVEL SECURITY;

-- Create policies for dre_groups
CREATE POLICY "Enable read access for authenticated users"
  ON dre_groups
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON dre_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users based on user_id"
  ON dre_groups
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id"
  ON dre_groups
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_dre_groups_user_id ON dre_groups(user_id);
CREATE INDEX idx_dre_groups_type ON dre_groups(type);
CREATE INDEX idx_dre_groups_order ON dre_groups("order");

-- Function to insert default DRE groups for a user
CREATE OR REPLACE FUNCTION insert_default_dre_groups(p_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Only insert if no DRE groups exist for this user
  IF NOT EXISTS (SELECT 1 FROM dre_groups WHERE user_id = p_user_id) THEN
    INSERT INTO dre_groups (id, name, type, "order", user_id)
    VALUES
      ('receita_bruta', 'Receita Bruta de Vendas', 'income', 1, p_user_id),
      ('impostos', 'Impostos', 'expense', 2, p_user_id),
      ('deducao_receita', 'Deduções de Receitas', 'expense', 3, p_user_id),
      ('custos_servicos', 'Custos dos Serviços Prestados', 'expense', 4, p_user_id),
      ('despesas_administrativas', 'Despesas Administrativas', 'expense', 5, p_user_id),
      ('despesas_pessoal', 'Despesas com Pessoal', 'expense', 6, p_user_id),
      ('despesas_variaveis', 'Despesas Variáveis', 'expense', 7, p_user_id),
      ('outras_receitas', 'Outras Receitas', 'income', 8, p_user_id),
      ('receitas_financeiras', 'Receitas Financeiras', 'income', 9, p_user_id),
      ('despesas_financeiras', 'Despesas Financeiras', 'expense', 10, p_user_id),
      ('investimentos', 'Investimentos', 'expense', 11, p_user_id);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to insert default DRE groups for new users
CREATE OR REPLACE FUNCTION handle_new_user_dre_groups()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM insert_default_dre_groups(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to insert default DRE groups when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created_dre_groups ON auth.users;
CREATE TRIGGER on_auth_user_created_dre_groups
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_dre_groups();

-- Insert default DRE groups for existing users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM auth.users LOOP
    PERFORM insert_default_dre_groups(user_record.id);
  END LOOP;
END $$;