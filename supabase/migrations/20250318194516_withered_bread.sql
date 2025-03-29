/*
  # Bank Balance Updates Implementation

  1. Changes
    - Add trigger function to update bank balances on transaction reconciliation
    - Add trigger to transactions table
    - Add proper constraints and indexes

  2. Security
    - Ensure data integrity with proper checks
*/

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

-- Add constraint to ensure bank_account exists
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS transactions_bank_account_fkey;

ALTER TABLE transactions
ADD CONSTRAINT transactions_bank_account_fkey
FOREIGN KEY (bank_account)
REFERENCES bank_accounts(id)
ON UPDATE CASCADE;

-- Create index for bank account reference
CREATE INDEX IF NOT EXISTS idx_transactions_bank_account
ON transactions(bank_account);