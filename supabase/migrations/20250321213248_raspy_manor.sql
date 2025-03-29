/*
  # Fix Transaction Attachments Migration

  1. Changes
    - Drop existing policy before creating
    - Create transaction_attachments table
    - Add proper indexes and constraints
    - Drop old attachment columns
*/

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Users can manage their own attachments" ON transaction_attachments;

-- Create transaction_attachments table if not exists
CREATE TABLE IF NOT EXISTS transaction_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  url text NOT NULL,
  name text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE transaction_attachments ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can manage their own attachments"
  ON transaction_attachments
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transaction_attachments_transaction_id 
ON transaction_attachments(transaction_id);

CREATE INDEX IF NOT EXISTS idx_transaction_attachments_user_id 
ON transaction_attachments(user_id);

-- Drop old attachment columns from transactions
ALTER TABLE transactions
DROP COLUMN IF EXISTS attachment_url,
DROP COLUMN IF EXISTS attachment_name;