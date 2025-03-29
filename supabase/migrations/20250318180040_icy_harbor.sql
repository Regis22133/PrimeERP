/*
  # Update categories table structure

  1. Changes
    - Remove name column requirement
    - Update existing data
*/

-- Make name column nullable
ALTER TABLE categories
ALTER COLUMN name DROP NOT NULL;