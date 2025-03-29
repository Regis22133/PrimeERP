-- Create categories table if not exists
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  category_type text NOT NULL,
  dre_group text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS if not already enabled
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Users can manage their own categories" ON categories;

-- Create policy for user data isolation
CREATE POLICY "Users can manage their own categories"
  ON categories
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for user_id for better query performance
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

-- Create trigger for updating updated_at if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_updated_at_categories'
  ) THEN
    CREATE TRIGGER set_updated_at_categories
      BEFORE UPDATE ON categories
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;