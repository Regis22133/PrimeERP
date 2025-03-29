/*
  # Add Invoice Attachments Support

  1. Changes
    - Add attachment_url and attachment_name columns to transactions table
    - Add indexes for better query performance
*/

-- Add attachment columns to transactions
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS attachment_url text,
ADD COLUMN IF NOT EXISTS attachment_name text;

-- Create indexes for attachment fields
CREATE INDEX IF NOT EXISTS idx_transactions_attachment_url 
ON transactions(attachment_url);

-- Enable storage for invoice attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Add storage policy for authenticated users
CREATE POLICY "Users can manage their own invoice attachments"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'invoices' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'invoices' AND (storage.foldername(name))[1] = auth.uid()::text);