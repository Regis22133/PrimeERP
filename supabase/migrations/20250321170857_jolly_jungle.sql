/*
  # Add Invoice Attachments Support

  1. Changes
    - Add attachment_url and attachment_name columns to transactions table
    - Add indexes for better query performance
    - Set up storage bucket for invoice attachments
*/

-- Add attachment columns to transactions
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS attachment_url text,
ADD COLUMN IF NOT EXISTS attachment_name text;

-- Create indexes for attachment fields
CREATE INDEX IF NOT EXISTS idx_transactions_attachment_url 
ON transactions(attachment_url);

-- Enable storage for invoice attachments if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'invoices'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('invoices', 'invoices', false);
  END IF;
END $$;