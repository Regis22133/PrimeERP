/*
  # Fix DRE Groups Table Setup

  1. Changes
    - Drop and recreate dre_groups table with proper structure
    - Add RLS policies
    - Add trigger for new user initialization
    - Fix VALUES clause with proper quoting for "order" column
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

-- Insert default DRE groups for existing users
INSERT INTO dre_groups (id, name, type, "order", user_id)
SELECT
  d.id,
  d.name,
  d.type,
  d."order",
  u.id as user_id
FROM
  (VALUES
    ('receita_bruta'::text, 'Receita Bruta de Vendas'::text, 'income'::text, 1::integer),
    ('impostos'::text, 'Impostos'::text, 'expense'::text, 2::integer),
    ('deducao_receita'::text, 'Deduções de Receitas'::text, 'expense'::text, 3::integer),
    ('custos_servicos'::text, 'Custos dos Serviços Prestados'::text, 'expense'::text, 4::integer),
    ('despesas_administrativas'::text, 'Despesas Administrativas'::text, 'expense'::text, 5::integer),
    ('despesas_pessoal'::text, 'Despesas com Pessoal'::text, 'expense'::text, 6::integer),
    ('despesas_variaveis'::text, 'Despesas Variáveis'::text, 'expense'::text, 7::integer),
    ('outras_receitas'::text, 'Outras Receitas'::text, 'income'::text, 8::integer),
    ('receitas_financeiras'::text, 'Receitas Financeiras'::text, 'income'::text, 9::integer),
    ('despesas_financeiras'::text, 'Despesas Financeiras'::text, 'expense'::text, 10::integer),
    ('investimentos'::text, 'Investimentos'::text, 'expense'::text, 11::integer)
  ) as d(id, name, type, "order")
CROSS JOIN auth.users u
ON CONFLICT (id, user_id) DO NOTHING;

-- Function to insert default DRE groups for a user
CREATE OR REPLACE FUNCTION insert_default_dre_groups()
RETURNS trigger AS $$
BEGIN
  INSERT INTO dre_groups (id, name, type, "order", user_id)
  VALUES
    ('receita_bruta', 'Receita Bruta de Vendas', 'income', 1, NEW.id),
    ('impostos', 'Impostos', 'expense', 2, NEW.id),
    ('deducao_receita', 'Deduções de Receitas', 'expense', 3, NEW.id),
    ('custos_servicos', 'Custos dos Serviços Prestados', 'expense', 4, NEW.id),
    ('despesas_administrativas', 'Despesas Administrativas', 'expense', 5, NEW.id),
    ('despesas_pessoal', 'Despesas com Pessoal', 'expense', 6, NEW.id),
    ('despesas_variaveis', 'Despesas Variáveis', 'expense', 7, NEW.id),
    ('outras_receitas', 'Outras Receitas', 'income', 8, NEW.id),
    ('receitas_financeiras', 'Receitas Financeiras', 'income', 9, NEW.id),
    ('despesas_financeiras', 'Despesas Financeiras', 'expense', 10, NEW.id),
    ('investimentos', 'Investimentos', 'expense', 11, NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to insert default DRE groups when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created_dre_groups ON auth.users;
CREATE TRIGGER on_auth_user_created_dre_groups
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION insert_default_dre_groups();