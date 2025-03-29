/*
  # Fix DRE Group Validation

  1. Changes
    - Drop existing constraint if exists
    - Add check constraint for DRE groups
    - Update validation trigger
    - Add proper error handling

  2. Security
    - Maintain data integrity with proper validation
*/

-- Drop existing constraint if exists
ALTER TABLE category_types
DROP CONSTRAINT IF EXISTS category_types_dre_group_check;

-- Add check constraint for DRE groups
ALTER TABLE category_types
ADD CONSTRAINT category_types_dre_group_check
CHECK (dre_group IN (
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
));

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

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS validate_category_type_dre_group_trigger ON category_types;

-- Create trigger for validation
CREATE TRIGGER validate_category_type_dre_group_trigger
  BEFORE INSERT OR UPDATE ON category_types
  FOR EACH ROW
  EXECUTE FUNCTION validate_category_type_dre_group();