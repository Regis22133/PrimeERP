/*
  # Fix Bank Account Deletion

  1. Changes
    - Add ON DELETE RESTRICT to bank_account foreign key
    - This will prevent deleting bank accounts that have transactions
*/

-- Drop existing foreign key constraint
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS transactions_bank_account_fkey;

-- Add new constraint with ON DELETE RESTRICT
ALTER TABLE transactions
ADD CONSTRAINT transactions_bank_account_fkey
FOREIGN KEY (bank_account)
REFERENCES bank_accounts(id)
ON UPDATE CASCADE
ON DELETE RESTRICT;

-- Create function to update bank account balance
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
      WHERE id = NEW.bank_account::uuid;
    -- When transaction is unreconciled
    ELSIF NEW.reconciled = false THEN
      UPDATE bank_accounts
      SET current_balance = current_balance - 
        CASE 
          WHEN NEW.type = 'income' THEN NEW.amount
          ELSE -NEW.amount
        END
      WHERE id = NEW.bank_account::uuid;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for balance updates
DROP TRIGGER IF EXISTS update_balance_on_reconciliation ON transactions;
CREATE TRIGGER update_balance_on_reconciliation
  AFTER UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_balance_on_reconciliation();

-- Create index for bank account reference if not exists
CREATE INDEX IF NOT EXISTS idx_transactions_bank_account
ON transactions(bank_account);