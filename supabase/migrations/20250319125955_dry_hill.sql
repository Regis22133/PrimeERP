/*
  # Fix Schema Setup

  1. Changes
    - Add IF NOT EXISTS to all table creations
    - Add IF NOT EXISTS to all index creations
    - Add OR REPLACE to all function creations
    - Add DROP TRIGGER IF EXISTS for all triggers
*/

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  description text NOT NULL,
  amount decimal(12,2) NOT NULL,
  category text NOT NULL,
  competence_date date NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'completed')),
  invoice_number text,
  bank_account uuid,
  supplier text,
  cost_center text,
  reconciled boolean DEFAULT false,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bank_accounts (
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

CREATE TABLE IF NOT EXISTS bank_statements (
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

CREATE TABLE IF NOT EXISTS category_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  dre_group text NOT NULL CHECK (
    dre_group IN (
      'receita_bruta',
      'impostos',
      'deducao_receita',
      'custos_servicos',
      'despesas_administrativas',
      'despesas_pessoal',
      'despesas_variaveis',
      'outras_receitas',
      'receitas_financeiras',
      'despesas_financeiras',
      'investimentos'
    )
  ),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE (name, user_id)
);

CREATE TABLE IF NOT EXISTS cost_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  active boolean DEFAULT true,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('client', 'supplier')),
  document text,
  email text,
  phone text,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables if not already enabled
DO $$ 
BEGIN
  EXECUTE 'ALTER TABLE transactions ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE category_types ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE contacts ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop existing policies before recreating
DROP POLICY IF EXISTS "Users can manage their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can manage their own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can manage their own bank statements" ON bank_statements;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON category_types;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON category_types;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON category_types;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON category_types;
DROP POLICY IF EXISTS "Users can manage their own cost centers" ON cost_centers;
DROP POLICY IF EXISTS "Users can manage their own contacts" ON contacts;

-- Create policies
CREATE POLICY "Users can manage their own transactions"
  ON transactions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own bank accounts"
  ON bank_accounts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own bank statements"
  ON bank_statements
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable read access for authenticated users"
  ON category_types
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON category_types
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users based on user_id"
  ON category_types
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id"
  ON category_types
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own cost centers"
  ON cost_centers
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own contacts"
  ON contacts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transactions_user_id') THEN
    CREATE INDEX idx_transactions_user_id ON transactions(user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transactions_bank_account') THEN
    CREATE INDEX idx_transactions_bank_account ON transactions(bank_account);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transactions_category') THEN
    CREATE INDEX idx_transactions_category ON transactions(category);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transactions_dates') THEN
    CREATE INDEX idx_transactions_dates ON transactions(competence_date, due_date);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transactions_status') THEN
    CREATE INDEX idx_transactions_status ON transactions(status);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transactions_reconciled') THEN
    CREATE INDEX idx_transactions_reconciled ON transactions(reconciled);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bank_accounts_user_id') THEN
    CREATE INDEX idx_bank_accounts_user_id ON bank_accounts(user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bank_statements_user_id') THEN
    CREATE INDEX idx_bank_statements_user_id ON bank_statements(user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bank_statements_account_id') THEN
    CREATE INDEX idx_bank_statements_account_id ON bank_statements(bank_account_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bank_statements_transaction_date') THEN
    CREATE INDEX idx_bank_statements_transaction_date ON bank_statements(transaction_date);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bank_statements_reconciled') THEN
    CREATE INDEX idx_bank_statements_reconciled ON bank_statements(reconciled);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_category_types_user_id') THEN
    CREATE INDEX idx_category_types_user_id ON category_types(user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_category_types_name') THEN
    CREATE INDEX idx_category_types_name ON category_types(name);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_category_types_dre_group') THEN
    CREATE INDEX idx_category_types_dre_group ON category_types(dre_group);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cost_centers_user_id') THEN
    CREATE INDEX idx_cost_centers_user_id ON cost_centers(user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cost_centers_active') THEN
    CREATE INDEX idx_cost_centers_active ON cost_centers(active);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_contacts_user_id') THEN
    CREATE INDEX idx_contacts_user_id ON contacts(user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_contacts_type') THEN
    CREATE INDEX idx_contacts_type ON contacts(type);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_contacts_name') THEN
    CREATE INDEX idx_contacts_name ON contacts(name);
  END IF;
END $$;

-- Create or replace trigger function for updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers before recreating
DROP TRIGGER IF EXISTS set_updated_at_transactions ON transactions;
DROP TRIGGER IF EXISTS set_updated_at_bank_accounts ON bank_accounts;
DROP TRIGGER IF EXISTS set_updated_at_cost_centers ON cost_centers;
DROP TRIGGER IF EXISTS set_updated_at_contacts ON contacts;

-- Add triggers for updated_at
CREATE TRIGGER set_updated_at_transactions
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_bank_accounts
  BEFORE UPDATE ON bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_cost_centers
  BEFORE UPDATE ON cost_centers
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_contacts
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Create or replace function to update bank account balance
CREATE OR REPLACE FUNCTION update_bank_balance_on_reconciliation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process changes in reconciliation status
  IF (TG_OP = 'UPDATE' AND OLD.reconciled IS DISTINCT FROM NEW.reconciled) THEN
    -- When transaction is reconciled
    IF NEW.reconciled = true THEN
      UPDATE bank_accounts
      SET current_balance = current_balance + 
        CASE 
          WHEN NEW.type = 'income' THEN NEW.amount
          ELSE -NEW.amount
        END
      WHERE id = NEW.bank_account;
    -- When transaction is unreconciled
    ELSIF NEW.reconciled = false THEN
      UPDATE bank_accounts
      SET current_balance = current_balance - 
        CASE 
          WHEN NEW.type = 'income' THEN NEW.amount
          ELSE -NEW.amount
        END
      WHERE id = NEW.bank_account;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger before recreating
DROP TRIGGER IF EXISTS update_balance_on_reconciliation ON transactions;

-- Create trigger for balance updates
CREATE TRIGGER update_balance_on_reconciliation
  AFTER UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_balance_on_reconciliation();