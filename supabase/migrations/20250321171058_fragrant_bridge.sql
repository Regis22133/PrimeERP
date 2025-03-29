/*
  # Fix Storage Permissions

  1. Changes
    - Drop existing storage policies
    - Create storage bucket with proper permissions
    - Add RLS policies for authenticated users
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for users own invoices" ON storage.objects;
DROP POLICY IF EXISTS "Enable insert access for users own invoices" ON storage.objects;
DROP POLICY IF EXISTS "Enable update access for users own invoices" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete access for users own invoices" ON storage.objects;

-- Create storage bucket if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'invoices'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'invoices',
      'invoices',
      false,
      5242880, -- 5MB limit
      ARRAY['application/pdf']::text[]
    );
  END IF;
END $$;

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create new storage policies with proper permissions
CREATE POLICY "Enable read access for users own invoices"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices' 
  AND auth.uid()::text = SPLIT_PART(name, '/', 1)
);

CREATE POLICY "Enable insert access for users own invoices"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'invoices' 
  AND auth.uid()::text = SPLIT_PART(name, '/', 1)
);

CREATE POLICY "Enable update access for users own invoices"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'invoices' 
  AND auth.uid()::text = SPLIT_PART(name, '/', 1)
)
WITH CHECK (
  bucket_id = 'invoices' 
  AND auth.uid()::text = SPLIT_PART(name, '/', 1)
);

CREATE POLICY "Enable delete access for users own invoices"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'invoices' 
  AND auth.uid()::text = SPLIT_PART(name, '/', 1)
);