/*
  # Fix Category Types RLS Policies

  1. Changes
    - Drop existing policies
    - Create new policies with proper permissions
    - Grant necessary permissions to authenticated users
    - Ensure RLS is enabled
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON category_types;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON category_types;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON category_types;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON category_types;

-- Create new policies with proper permissions
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

-- Make sure RLS is enabled
ALTER TABLE category_types ENABLE ROW LEVEL SECURITY;