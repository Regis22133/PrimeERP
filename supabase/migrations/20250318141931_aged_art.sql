/*
  # Add name field to categories table

  1. Changes
    - Add name column to categories table
    - Make name column required
*/

-- Add name column to categories table
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS name text NOT NULL;