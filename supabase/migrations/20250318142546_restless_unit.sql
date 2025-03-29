/*
  # Update categories table to make category_type optional

  1. Changes
    - Modify category_type column to be nullable
*/

-- Make category_type column nullable
ALTER TABLE categories 
ALTER COLUMN category_type DROP NOT NULL;