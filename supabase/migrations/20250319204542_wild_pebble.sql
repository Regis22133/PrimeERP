/*
  # Add CMV and CPV DRE Groups

  1. Changes
    - Add new DRE groups for CMV and CPV
    - Update order of existing groups
    - Add new groups to validation check

  2. Security
    - Maintain existing RLS policies
*/

-- Add new DRE groups to check constraint
ALTER TABLE category_types
DROP CONSTRAINT IF EXISTS category_types_dre_group_check;

ALTER TABLE category_types
ADD CONSTRAINT category_types_dre_group_check
CHECK (dre_group IN (
  'receita_bruta',
  'impostos',
  'deducao_receita',
  'custos_cmv',
  'custos_cpv',
  'custos_servicos',
  'despesas_administrativas',
  'despesas_pessoal',
  'despesas_variaveis',
  'outras_receitas',
  'receitas_financeiras',
  'despesas_financeiras',
  'investimentos'
));

-- Update validation function
CREATE OR REPLACE FUNCTION validate_category_type_dre_group()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate income categories
  IF NEW.type = 'income' AND NEW.dre_group NOT IN (
    'receita_bruta',
    'outras_receitas',
    'receitas_financeiras'
  ) THEN
    RAISE EXCEPTION 'Invalid DRE group for income category';
  END IF;

  -- Validate expense categories
  IF NEW.type = 'expense' AND NEW.dre_group NOT IN (
    'impostos',
    'deducao_receita',
    'custos_cmv',
    'custos_cpv',
    'custos_servicos',
    'despesas_administrativas',
    'despesas_pessoal',
    'despesas_variaveis',
    'despesas_financeiras',
    'investimentos'
  ) THEN
    RAISE EXCEPTION 'Invalid DRE group for expense category';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Insert new DRE groups for existing users
INSERT INTO dre_groups (id, name, type, "order", user_id)
SELECT
  'custos_cmv',
  'Custos das Mercadorias Vendidas (CMV)',
  'expense',
  4,
  u.id
FROM auth.users u
ON CONFLICT (id, user_id) DO NOTHING;

INSERT INTO dre_groups (id, name, type, "order", user_id)
SELECT
  'custos_cpv',
  'Custos dos Produtos Vendidos (CPV)',
  'expense',
  5,
  u.id
FROM auth.users u
ON CONFLICT (id, user_id) DO NOTHING;

-- Update order of existing groups
UPDATE dre_groups SET "order" = "order" + 2 WHERE "order" >= 4;

-- Update default DRE groups function for new users
CREATE OR REPLACE FUNCTION insert_default_dre_groups()
RETURNS trigger AS $$
BEGIN
  INSERT INTO dre_groups (id, name, type, "order", user_id)
  VALUES
    ('receita_bruta', 'Receita Bruta de Vendas', 'income', 1, NEW.id),
    ('impostos', 'Impostos', 'expense', 2, NEW.id),
    ('deducao_receita', 'Deduções de Receitas', 'expense', 3, NEW.id),
    ('custos_cmv', 'Custos das Mercadorias Vendidas (CMV)', 'expense', 4, NEW.id),
    ('custos_cpv', 'Custos dos Produtos Vendidos (CPV)', 'expense', 5, NEW.id),
    ('custos_servicos', 'Custos dos Serviços Prestados', 'expense', 6, NEW.id),
    ('despesas_administrativas', 'Despesas Administrativas', 'expense', 7, NEW.id),
    ('despesas_pessoal', 'Despesas com Pessoal', 'expense', 8, NEW.id),
    ('despesas_variaveis', 'Despesas Variáveis', 'expense', 9, NEW.id),
    ('outras_receitas', 'Outras Receitas', 'income', 10, NEW.id),
    ('receitas_financeiras', 'Receitas Financeiras', 'income', 11, NEW.id),
    ('despesas_financeiras', 'Despesas Financeiras', 'expense', 12, NEW.id),
    ('investimentos', 'Investimentos', 'expense', 13, NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;