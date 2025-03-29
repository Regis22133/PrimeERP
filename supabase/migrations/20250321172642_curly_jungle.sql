/*
  # Storage Bucket Setup for Invoices

  1. Changes
    - Create invoices storage bucket
    - Set proper file size limits and MIME types
    - Add RLS policies for secure access
    - Grant necessary permissions
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for users own invoices" ON storage.objects;
DROP POLICY IF EXISTS "Enable insert access for users own invoices" ON storage.objects;
DROP POLICY IF EXISTS "Enable update access for users own invoices" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete access for users own invoices" ON storage.objects;

-- Create storage bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  true, -- Make bucket public to allow direct access to files
  52428800, -- 50MB limit
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf']::text[];

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create storage policies with proper permissions
CREATE POLICY "Enable read access for users own invoices"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices' 
  AND (auth.uid()::text = SPLIT_PART(name, '/', 1))
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

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;