/*
  # Category and DRE Integration

  1. Changes
    - Add dre_group to category_types table
    - Update foreign key constraints
    - Add validation for DRE groups

  2. Security
    - Maintain existing RLS policies
*/

-- Add dre_group to category_types
ALTER TABLE category_types
ADD COLUMN dre_group text NOT NULL CHECK (
  dre_group IN (
    'receita_bruta',
    'impostos',
    'deducao_receita',
    'custos_servicos',
    'despesas_administrativas',
    'despesas_pessoal',
    'despesas_variaveis',
    'outras_receitas',
    'receitas_financeiras',
    'despesas_financeiras',
    'investimentos'
  )
);

-- Create index for dre_group
CREATE INDEX IF NOT EXISTS idx_category_types_dre_group 
ON category_types(dre_group);

-- Add validation trigger to ensure income/expense types match DRE groups
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

-- Create trigger for validation
CREATE TRIGGER validate_category_type_dre_group_trigger
  BEFORE INSERT OR UPDATE ON category_types
  FOR EACH ROW
  EXECUTE FUNCTION validate_category_type_dre_group();