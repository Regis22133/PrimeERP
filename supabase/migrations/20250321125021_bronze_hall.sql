/*
  # Fix Category Types Schema

  1. Changes
    - Add active column to category_types table
    - Set default value to true
    - Update existing rows
*/

-- Add active column to category_types if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'category_types' AND column_name = 'active'
  ) THEN
    ALTER TABLE category_types
    ADD COLUMN active boolean DEFAULT true;
  END IF;
END $$;

-- Create index for active status
CREATE INDEX IF NOT EXISTS idx_category_types_active 
ON category_types(active);

-- Update existing rows to have active = true
UPDATE category_types 
SET active = true 
WHERE active IS NULL;