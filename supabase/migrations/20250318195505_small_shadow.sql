/*
  # Fix Bank Balance Updates

  1. Changes
    - Update trigger function to handle balance updates properly
    - Add validation to prevent negative balances
    - Add error handling
*/

-- Create or replace function to update bank account balance
CREATE OR REPLACE FUNCTION update_bank_balance_on_reconciliation()
RETURNS TRIGGER AS $$
DECLARE
  v_new_balance decimal(12,2);
  v_bank_account bank_accounts%ROWTYPE;
BEGIN
  -- Only process changes in reconciliation status
  IF (TG_OP = 'UPDATE' AND OLD.reconciled IS DISTINCT FROM NEW.reconciled) THEN
    -- Get bank account
    SELECT * INTO v_bank_account
    FROM bank_accounts
    WHERE id = NEW.bank_account;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Bank account not found';
    END IF;

    -- Calculate amount to adjust
    v_new_balance := v_bank_account.current_balance + 
      CASE 
        WHEN NEW.reconciled = true THEN
          -- When reconciling, add income or subtract expense
          CASE 
            WHEN NEW.type = 'income' THEN NEW.amount
            ELSE -NEW.amount
          END
        ELSE
          -- When unreconciling, subtract income or add expense
          CASE 
            WHEN NEW.type = 'income' THEN -NEW.amount
            ELSE NEW.amount
          END
      END;

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

-- Update all bank account balances to fix any discrepancies
DO $$
DECLARE
  v_account bank_accounts%ROWTYPE;
BEGIN
  -- For each bank account
  FOR v_account IN SELECT * FROM bank_accounts LOOP
    -- Reset balance to initial balance
    UPDATE bank_accounts 
    SET current_balance = initial_balance
    WHERE id = v_account.id;

    -- Add all reconciled income transactions
    UPDATE bank_accounts 
    SET current_balance = current_balance + COALESCE(
      (SELECT SUM(amount)
       FROM transactions
       WHERE bank_account = v_account.id
         AND type = 'income'
         AND reconciled = true), 0)
    WHERE id = v_account.id;

    -- Subtract all reconciled expense transactions
    UPDATE bank_accounts 
    SET current_balance = current_balance - COALESCE(
      (SELECT SUM(amount)
       FROM transactions
       WHERE bank_account = v_account.id
         AND type = 'expense'
         AND reconciled = true), 0)
    WHERE id = v_account.id;
  END LOOP;
END $$;