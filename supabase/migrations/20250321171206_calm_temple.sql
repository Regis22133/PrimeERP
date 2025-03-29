/*
  # Fix Storage Permissions

  1. Changes
    - Drop existing storage policies
    - Update storage bucket configuration
    - Add RLS policies for authenticated users
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for users own invoices" ON storage.objects;
DROP POLICY IF EXISTS "Enable insert access for users own invoices" ON storage.objects;
DROP POLICY IF EXISTS "Enable update access for users own invoices" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete access for users own invoices" ON storage.objects;

-- Update storage bucket configuration
UPDATE storage.buckets
SET public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['application/pdf']::text[]
WHERE id = 'invoices';

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