/*
  # Add Description Column to Category Types

  1. Changes
    - Add description column to category_types table
    - Set default value to null
    - Add index for better query performance
*/

-- Add description column to category_types if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'category_types' AND column_name = 'description'
  ) THEN
    ALTER TABLE category_types
    ADD COLUMN description text;
  END IF;
END $$;

-- Create index for description field
CREATE INDEX IF NOT EXISTS idx_category_types_description 
ON category_types(description);

-- Update existing rows to have description = null if not set
UPDATE category_types 
SET description = null 
WHERE description IS NULL;