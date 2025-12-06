-- Migration to add 'adjustment' transaction type support
-- Run this after the base transactions schema is set up

-- Step 1: Add adjusted_amount column to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS adjusted_amount BIGINT;

-- Step 2: Update the type constraint to include 'adjustment'
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
  CHECK (type IN ('expense', 'income', 'transfer', 'goal', 'goal_withdraw', 'adjustment'));

-- Step 3: Update the account reference constraint to handle adjustment type
-- Adjustment: to_account_id is required (the account being adjusted)
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_transaction_accounts;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_expense_accounts;
ALTER TABLE transactions ADD CONSTRAINT check_transaction_accounts CHECK (
  (type = 'expense' AND from_account_id IS NOT NULL AND to_account_id IS NULL) OR
  (type = 'income' AND from_account_id IS NULL AND to_account_id IS NOT NULL) OR
  (type = 'transfer' AND from_account_id IS NOT NULL AND to_account_id IS NOT NULL AND from_account_id != to_account_id) OR
  (type = 'goal' AND from_account_id IS NOT NULL AND to_account_id IS NULL) OR
  (type = 'goal_withdraw' AND from_account_id IS NULL AND to_account_id IS NOT NULL) OR
  (type = 'adjustment' AND from_account_id IS NULL AND to_account_id IS NOT NULL)
);

-- Step 4: Update the trigger function to handle adjustment transactions
-- This updates the consolidated function from supabase_transactions_schema_fixed.sql
-- Note: You may need to update the function in that file as well

CREATE OR REPLACE FUNCTION update_balances_on_transaction_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- ========================================================================
  -- EXPENSE: Deduct from account
  -- ========================================================================
  IF NEW.type = 'expense' AND NEW.from_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance - NEW.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = NEW.from_account_id;
  END IF;

  -- ========================================================================
  -- INCOME: Add to account
  -- ========================================================================
  IF NEW.type = 'income' AND NEW.to_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance + NEW.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = NEW.to_account_id;
  END IF;

  -- ========================================================================
  -- TRANSFER: Deduct from source, add to destination
  -- ========================================================================
  IF NEW.type = 'transfer' 
     AND NEW.from_account_id IS NOT NULL 
     AND NEW.to_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance - NEW.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = NEW.from_account_id;
    
    UPDATE accounts
    SET balance = balance + NEW.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = NEW.to_account_id;
  END IF;

  -- ========================================================================
  -- GOAL: Deduct from account (like expense)
  -- ========================================================================
  IF NEW.type = 'goal' AND NEW.from_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance - NEW.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = NEW.from_account_id;
  END IF;

  -- ========================================================================
  -- GOAL_WITHDRAW: Add to account (like income)
  -- ========================================================================
  IF NEW.type = 'goal_withdraw' AND NEW.to_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance + NEW.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = NEW.to_account_id;
  END IF;

  -- ========================================================================
  -- ADJUSTMENT: Update account balance by adjusted_amount
  -- ========================================================================
  IF NEW.type = 'adjustment' AND NEW.to_account_id IS NOT NULL AND NEW.adjusted_amount IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance + NEW.adjusted_amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = NEW.to_account_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Update the delete function to handle adjustments
CREATE OR REPLACE FUNCTION revert_balances_on_transaction_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle expense: add back to from_account
  IF OLD.type = 'expense' AND OLD.from_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance + OLD.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = OLD.from_account_id;
  END IF;

  -- Handle income: deduct from to_account
  IF OLD.type = 'income' AND OLD.to_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance - OLD.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = OLD.to_account_id;
  END IF;

  -- Handle transfer: add back to from_account, deduct from to_account
  IF OLD.type = 'transfer' AND OLD.from_account_id IS NOT NULL AND OLD.to_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance + OLD.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = OLD.from_account_id;
    
    UPDATE accounts
    SET balance = balance - OLD.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = OLD.to_account_id;
  END IF;

  -- Handle goal: add back to from_account
  IF OLD.type = 'goal' AND OLD.from_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance + OLD.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = OLD.from_account_id;
  END IF;

  -- Handle goal_withdraw: deduct from to_account
  IF OLD.type = 'goal_withdraw' AND OLD.to_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance - OLD.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = OLD.to_account_id;
  END IF;

  -- Handle adjustment: revert the adjusted_amount
  IF OLD.type = 'adjustment' AND OLD.to_account_id IS NOT NULL AND OLD.adjusted_amount IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance - OLD.adjusted_amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = OLD.to_account_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Update the update function to handle adjustments
CREATE OR REPLACE FUNCTION update_balances_on_transaction_update()
RETURNS TRIGGER AS $$
BEGIN
  -- First, revert the old transaction's effect
  IF OLD.type = 'expense' AND OLD.from_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance + OLD.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = OLD.from_account_id;
  END IF;

  IF OLD.type = 'income' AND OLD.to_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance - OLD.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = OLD.to_account_id;
  END IF;

  IF OLD.type = 'transfer' AND OLD.from_account_id IS NOT NULL AND OLD.to_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance + OLD.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = OLD.from_account_id;
    
    UPDATE accounts
    SET balance = balance - OLD.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = OLD.to_account_id;
  END IF;

  IF OLD.type = 'goal' AND OLD.from_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance + OLD.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = OLD.from_account_id;
  END IF;

  IF OLD.type = 'goal_withdraw' AND OLD.to_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance - OLD.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = OLD.to_account_id;
  END IF;

  IF OLD.type = 'adjustment' AND OLD.to_account_id IS NOT NULL AND OLD.adjusted_amount IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance - OLD.adjusted_amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = OLD.to_account_id;
  END IF;

  -- Then, apply the new transaction's effect
  IF NEW.type = 'expense' AND NEW.from_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance - NEW.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = NEW.from_account_id;
  END IF;

  IF NEW.type = 'income' AND NEW.to_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance + NEW.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = NEW.to_account_id;
  END IF;

  IF NEW.type = 'transfer' AND NEW.from_account_id IS NOT NULL AND NEW.to_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance - NEW.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = NEW.from_account_id;
    
    UPDATE accounts
    SET balance = balance + NEW.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = NEW.to_account_id;
  END IF;

  IF NEW.type = 'goal' AND NEW.from_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance - NEW.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = NEW.from_account_id;
  END IF;

  IF NEW.type = 'goal_withdraw' AND NEW.to_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance + NEW.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = NEW.to_account_id;
  END IF;

  IF NEW.type = 'adjustment' AND NEW.to_account_id IS NOT NULL AND NEW.adjusted_amount IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance + NEW.adjusted_amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = NEW.to_account_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

