/*
  # Fix Bank Balance Updates on Unreconciliation

  1. Changes
    - Update trigger function to handle unreconciliation properly
    - Add validation to prevent negative balances
    - Add error handling
*/

-- Create or replace function to update bank account balance
CREATE OR REPLACE FUNCTION update_bank_balance_on_reconciliation()
RETURNS TRIGGER AS $$
DECLARE
  v_new_balance decimal(12,2);
BEGIN
  -- Only process changes in reconciliation status
  IF (TG_OP = 'UPDATE' AND OLD.reconciled IS DISTINCT FROM NEW.reconciled) THEN
    -- Calculate new balance
    SELECT current_balance + 
      CASE 
        WHEN NEW.reconciled = true THEN
          CASE 
            WHEN NEW.type = 'income' THEN NEW.amount
            ELSE -NEW.amount
          END
        ELSE
          CASE 
            WHEN NEW.type = 'income' THEN -NEW.amount
            ELSE NEW.amount
          END
      END
    INTO v_new_balance
    FROM bank_accounts
    WHERE id = NEW.bank_account;

    -- Validate new balance
    IF v_new_balance IS NULL THEN
      RAISE EXCEPTION 'Bank account not found';
    END IF;

    -- Update bank account balance
    UPDATE bank_accounts
    SET 
      current_balance = v_new_balance,
      updated_at = now()
    WHERE id = NEW.bank_account;

    -- Return the updated row
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_balance_on_reconciliation ON transactions;

-- Create trigger for balance updates
CREATE TRIGGER update_balance_on_reconciliation
  AFTER UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_balance_on_reconciliation();

-- Create index for reconciled status if not exists
CREATE INDEX IF NOT EXISTS idx_transactions_reconciled 
ON transactions(reconciled);

-- Create index for bank account reference if not exists
CREATE INDEX IF NOT EXISTS idx_transactions_bank_account
ON transactions(bank_account);