/*
  # Integração com Contas Bancárias

  1. New Tables
    - `bank_accounts`: Armazena as contas bancárias
      - `id` (uuid, primary key)
      - `name` (text): Nome da conta
      - `bank_code` (text): Código do banco
      - `agency` (text): Número da agência
      - `account_number` (text): Número da conta
      - `initial_balance` (decimal): Saldo inicial
      - `current_balance` (decimal): Saldo atual
      - `user_id` (uuid): ID do usuário
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `bank_statements`: Armazena os extratos bancários
      - `id` (uuid, primary key)
      - `bank_account_id` (uuid): ID da conta bancária
      - `transaction_date` (date): Data da transação
      - `description` (text): Descrição da transação
      - `amount` (decimal): Valor da transação
      - `type` (text): Tipo (credit/debit)
      - `balance` (decimal): Saldo após a transação
      - `reconciled` (boolean): Status de conciliação
      - `transaction_id` (uuid): ID da transação relacionada
      - `user_id` (uuid): ID do usuário
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for user access control

  3. Indexes
    - Add indexes for better query performance
*/

-- Create bank_accounts table
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  bank_code text NOT NULL,
  agency text NOT NULL,
  account_number text NOT NULL,
  initial_balance decimal(12,2) NOT NULL DEFAULT 0,
  current_balance decimal(12,2) NOT NULL DEFAULT 0,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create bank_statements table
CREATE TABLE IF NOT EXISTS public.bank_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id uuid NOT NULL REFERENCES bank_accounts(id),
  transaction_date date NOT NULL,
  description text NOT NULL,
  amount decimal(12,2) NOT NULL,
  type text NOT NULL CHECK (type IN ('credit', 'debit')),
  balance decimal(12,2) NOT NULL,
  reconciled boolean DEFAULT false,
  transaction_id uuid REFERENCES transactions(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own bank accounts"
  ON bank_accounts
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own bank statements"
  ON bank_statements
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER set_updated_at_bank_accounts
  BEFORE UPDATE ON bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_statements_user_id ON bank_statements(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_statements_account_id ON bank_statements(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_statements_transaction_date ON bank_statements(transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_statements_reconciled ON bank_statements(reconciled);

-- Function to update bank account balance
CREATE OR REPLACE FUNCTION update_bank_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE bank_accounts
    SET current_balance = current_balance + 
      CASE 
        WHEN NEW.type = 'credit' THEN NEW.amount
        ELSE -NEW.amount
      END
    WHERE id = NEW.bank_account_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE bank_accounts
    SET current_balance = current_balance - 
      CASE 
        WHEN OLD.type = 'credit' THEN OLD.amount
        ELSE -OLD.amount
      END
    WHERE id = OLD.bank_account_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for bank statement changes
CREATE TRIGGER update_balance_on_statement_change
  AFTER INSERT OR DELETE ON bank_statements
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_account_balance();