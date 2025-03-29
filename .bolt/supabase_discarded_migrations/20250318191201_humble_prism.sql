/*
  # Revert Category System to Basic Version

  1. Changes
    - Remove DRE group from category_types
    - Remove validation trigger
    - Simplify category system to just name and type
*/

-- Drop existing constraints and triggers
DROP TRIGGER IF EXISTS validate_category_type_dre_group_trigger ON category_types;
DROP FUNCTION IF EXISTS validate_category_type_dre_group;
DROP INDEX IF EXISTS idx_category_types_dre_group;

-- Remove dre_group column
ALTER TABLE category_types
DROP COLUMN IF EXISTS dre_group;

-- Make sure basic structure is correct
ALTER TABLE category_types
ALTER COLUMN name SET NOT NULL,
ALTER COLUMN type SET NOT NULL,
ALTER COLUMN user_id SET NOT NULL;

-- Ensure proper check constraint for type
ALTER TABLE category_types
DROP CONSTRAINT IF EXISTS category_types_type_check;

ALTER TABLE category_types
ADD CONSTRAINT category_types_type_check 
CHECK (type IN ('income', 'expense'));

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_category_types_user_id 
ON category_types(user_id);

CREATE INDEX IF NOT EXISTS idx_category_types_name 
ON category_types(name);

-- Ensure RLS policies are correct
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON category_types;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON category_types;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON category_types;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON category_types;

CREATE POLICY "Enable read access for authenticated users"
  ON category_types
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON category_types
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for users based on user_id"
  ON category_types
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id"
  ON category_types
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON category_types TO authenticated;