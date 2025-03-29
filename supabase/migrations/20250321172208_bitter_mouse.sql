-- Update storage bucket configuration with larger file size limit
UPDATE storage.buckets
SET file_size_limit = 52428800 -- 50MB limit
WHERE id = 'invoices';

-- Recreate storage policies to ensure proper access
DROP POLICY IF EXISTS "Enable read access for users own invoices" ON storage.objects;
DROP POLICY IF EXISTS "Enable insert access for users own invoices" ON storage.objects;
DROP POLICY IF EXISTS "Enable update access for users own invoices" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete access for users own invoices" ON storage.objects;

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