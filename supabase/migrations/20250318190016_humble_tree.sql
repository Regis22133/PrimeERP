/*
  # Fix RLS Policy for Category Types

  1. Changes
    - Drop existing policy
    - Create new policy with proper permissions
    - Add public access for authenticated users
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can manage their own category types" ON category_types;

-- Create new policy that allows authenticated users to manage their own category types
CREATE POLICY "Users can manage their own category types"
ON category_types
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions to authenticated users
GRANT ALL ON category_types TO authenticated;

-- Make sure RLS is enabled
ALTER TABLE category_types ENABLE ROW LEVEL SECURITY;