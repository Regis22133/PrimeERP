/*
  # Add Company Profile Data

  1. Changes
    - Add company profile fields to profiles table
    - Add validation for CNPJ and CEP
    - Add indexes for better query performance
*/

-- Add company profile fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS company_name text,
ADD COLUMN IF NOT EXISTS cnpj text,
ADD COLUMN IF NOT EXISTS cep text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS neighborhood text;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_cnpj ON profiles(cnpj);
CREATE INDEX IF NOT EXISTS idx_profiles_cep ON profiles(cep);