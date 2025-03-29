/*
  # Fix Storage Permissions

  1. Changes
    - Drop existing storage policies
    - Create new storage bucket with proper permissions
    - Add RLS policies for authenticated users
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own invoice attachments" ON storage.objects;

-- Create storage bucket if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'invoices'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('invoices', 'invoices', false);
  END IF;
END $$;

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create new storage policies
CREATE POLICY "Enable read access for users own invoices"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Enable insert access for users own invoices"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'invoices' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Enable update access for users own invoices"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'invoices' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'invoices' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Enable delete access for users own invoices"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'invoices' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);