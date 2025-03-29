/*
  # Fix DRE Groups Table and Relations

  1. Changes
    - Drop existing dre_groups table
    - Create dre_groups table with composite primary key
    - Add RLS policies
    - Add trigger for new users
    - Insert default groups for existing users with proper error handling
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
  -- Use composite primary key to allow same group ID for different users
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

-- Function to safely insert default DRE groups for a user
CREATE OR REPLACE FUNCTION insert_default_dre_groups(p_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Insert each group individually with error handling
  BEGIN
    INSERT INTO dre_groups (id, name, type, "order", user_id)
    VALUES ('receita_bruta', 'Receita Bruta de Vendas', 'income', 1, p_user_id)
    ON CONFLICT (id, user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Log error and continue
    RAISE NOTICE 'Error inserting receita_bruta: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO dre_groups (id, name, type, "order", user_id)
    VALUES ('impostos', 'Impostos', 'expense', 2, p_user_id)
    ON CONFLICT (id, user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error inserting impostos: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO dre_groups (id, name, type, "order", user_id)
    VALUES ('deducao_receita', 'Deduções de Receitas', 'expense', 3, p_user_id)
    ON CONFLICT (id, user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error inserting deducao_receita: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO dre_groups (id, name, type, "order", user_id)
    VALUES ('custos_servicos', 'Custos dos Serviços Prestados', 'expense', 4, p_user_id)
    ON CONFLICT (id, user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error inserting custos_servicos: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO dre_groups (id, name, type, "order", user_id)
    VALUES ('despesas_administrativas', 'Despesas Administrativas', 'expense', 5, p_user_id)
    ON CONFLICT (id, user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error inserting despesas_administrativas: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO dre_groups (id, name, type, "order", user_id)
    VALUES ('despesas_pessoal', 'Despesas com Pessoal', 'expense', 6, p_user_id)
    ON CONFLICT (id, user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error inserting despesas_pessoal: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO dre_groups (id, name, type, "order", user_id)
    VALUES ('despesas_variaveis', 'Despesas Variáveis', 'expense', 7, p_user_id)
    ON CONFLICT (id, user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error inserting despesas_variaveis: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO dre_groups (id, name, type, "order", user_id)
    VALUES ('outras_receitas', 'Outras Receitas', 'income', 8, p_user_id)
    ON CONFLICT (id, user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error inserting outras_receitas: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO dre_groups (id, name, type, "order", user_id)
    VALUES ('receitas_financeiras', 'Receitas Financeiras', 'income', 9, p_user_id)
    ON CONFLICT (id, user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error inserting receitas_financeiras: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO dre_groups (id, name, type, "order", user_id)
    VALUES ('despesas_financeiras', 'Despesas Financeiras', 'expense', 10, p_user_id)
    ON CONFLICT (id, user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error inserting despesas_financeiras: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO dre_groups (id, name, type, "order", user_id)
    VALUES ('investimentos', 'Investimentos', 'expense', 11, p_user_id)
    ON CONFLICT (id, user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error inserting investimentos: %', SQLERRM;
  END;
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