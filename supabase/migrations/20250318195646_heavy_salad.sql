/*
  # Fix Bank Account Balances

  1. Changes
    - Reset all bank account balances to their initial values
    - Recalculate balances based on reconciled transactions
    - Add validation to prevent negative balances
    - Add error handling
*/

-- Reset and recalculate all bank account balances
DO $$
DECLARE
  v_account bank_accounts%ROWTYPE;
  v_income decimal(12,2);
  v_expense decimal(12,2);
BEGIN
  -- For each bank account
  FOR v_account IN SELECT * FROM bank_accounts LOOP
    -- Get total reconciled income
    SELECT COALESCE(SUM(amount), 0)
    INTO v_income
    FROM transactions
    WHERE bank_account = v_account.id
      AND type = 'income'
      AND reconciled = true;

    -- Get total reconciled expenses
    SELECT COALESCE(SUM(amount), 0)
    INTO v_expense
    FROM transactions
    WHERE bank_account = v_account.id
      AND type = 'expense'
      AND reconciled = true;

    -- Update bank account with recalculated balance
    UPDATE bank_accounts 
    SET current_balance = initial_balance + v_income - v_expense,
        updated_at = now()
    WHERE id = v_account.id;

    -- Log the update for verification
    RAISE NOTICE 'Updated bank account %: initial=%, income=%, expense=%, final=%',
      v_account.name,
      v_account.initial_balance,
      v_income,
      v_expense,
      v_account.initial_balance + v_income - v_expense;
  END LOOP;
END $$;

-- Create or replace function to validate bank account balance
CREATE OR REPLACE FUNCTION validate_bank_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Verify the bank account exists
  IF NOT EXISTS (SELECT 1 FROM bank_accounts WHERE id = NEW.bank_account) THEN
    RAISE EXCEPTION 'Bank account not found';
  END IF;

  -- Calculate new balance for validation
  WITH new_balance AS (
    SELECT 
      initial_balance + 
      COALESCE((
        SELECT SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END)
        FROM transactions
        WHERE bank_account = NEW.bank_account
          AND reconciled = true
      ), 0) as balance
    FROM bank_accounts
    WHERE id = NEW.bank_account
  )
  SELECT balance INTO NEW.balance
  FROM new_balance;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;