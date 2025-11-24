-- ============================================================================
-- CONSOLIDATED TRANSACTIONS SCHEMA WITH FIXED TRIGGERS
-- ============================================================================
-- This file consolidates all transaction-related triggers and functions
-- to fix the double-update issue and ensure consistent balance management.
--
-- ISSUES FIXED:
-- 1. Removed duplicate triggers that caused double balance updates
-- 2. Added goal saved_amount updates to triggers (no manual RPC needed)
-- 3. Consolidated all transaction types into single, consistent functions
-- 4. Proper handling of all transaction types: expense, income, transfer, 
--    goal, goal_withdraw, fund_expense
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop all existing triggers to prevent conflicts
-- ============================================================================
DROP TRIGGER IF EXISTS update_account_balance_on_transaction_insert ON transactions;
DROP TRIGGER IF EXISTS revert_account_balance_on_transaction_delete ON transactions;
DROP TRIGGER IF EXISTS update_account_balance_on_transaction_update ON transactions;
DROP TRIGGER IF EXISTS transaction_balance_update ON transactions;
DROP TRIGGER IF EXISTS transaction_balance_delete ON transactions;

-- ============================================================================
-- STEP 2: Consolidated function for INSERT operations
-- ============================================================================
-- This function handles ALL transaction types and updates both account balances
-- and goal saved_amount values automatically.
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
  -- GOAL DEPOSIT: Deduct from account, add to goal saved_amount
  -- ========================================================================
  IF NEW.type = 'goal' AND NEW.from_account_id IS NOT NULL THEN
    -- Update account balance
    UPDATE accounts
    SET balance = balance - NEW.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = NEW.from_account_id;
    
    -- Update goal saved_amount if fund_id is provided
    -- This allows backward compatibility: if fund_id is NULL, goal update
    -- can still be done manually via RPC, but if fund_id is provided,
    -- it's handled automatically by the trigger
    IF NEW.fund_id IS NOT NULL THEN
      UPDATE goals
      SET saved_amount = saved_amount + NEW.amount,
          updated_at = TIMEZONE('utc', NOW())
      WHERE id = NEW.fund_id;
    END IF;
  END IF;

  -- ========================================================================
  -- GOAL WITHDRAWAL: Add to account, deduct from goal saved_amount
  -- ========================================================================
  IF NEW.type = 'goal_withdraw' AND NEW.to_account_id IS NOT NULL THEN
    -- Update account balance
    UPDATE accounts
    SET balance = balance + NEW.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = NEW.to_account_id;
    
    -- Update goal saved_amount if fund_id is provided
    IF NEW.fund_id IS NOT NULL THEN
      UPDATE goals
      SET saved_amount = saved_amount - NEW.amount,
          updated_at = TIMEZONE('utc', NOW())
      WHERE id = NEW.fund_id;
    END IF;
  END IF;

  -- ========================================================================
  -- FUND EXPENSE: Deduct from goal saved_amount only (no account change)
  -- ========================================================================
  IF NEW.type = 'fund_expense' AND NEW.fund_id IS NOT NULL THEN
    UPDATE goals
    SET saved_amount = saved_amount - NEW.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = NEW.fund_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 3: Consolidated function for DELETE operations
-- ============================================================================
CREATE OR REPLACE FUNCTION revert_balances_on_transaction_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- ========================================================================
  -- EXPENSE: Add back to account
  -- ========================================================================
  IF OLD.type = 'expense' AND OLD.from_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance + OLD.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = OLD.from_account_id;
  END IF;

  -- ========================================================================
  -- INCOME: Deduct from account
  -- ========================================================================
  IF OLD.type = 'income' AND OLD.to_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance - OLD.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = OLD.to_account_id;
  END IF;

  -- ========================================================================
  -- TRANSFER: Reverse both account changes
  -- ========================================================================
  IF OLD.type = 'transfer' 
     AND OLD.from_account_id IS NOT NULL 
     AND OLD.to_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance + OLD.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = OLD.from_account_id;
    
    UPDATE accounts
    SET balance = balance - OLD.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = OLD.to_account_id;
  END IF;

  -- ========================================================================
  -- GOAL DEPOSIT: Add back to account, deduct from goal saved_amount
  -- ========================================================================
  IF OLD.type = 'goal' AND OLD.from_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance + OLD.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = OLD.from_account_id;
    
    IF OLD.fund_id IS NOT NULL THEN
      UPDATE goals
      SET saved_amount = saved_amount - OLD.amount,
          updated_at = TIMEZONE('utc', NOW())
      WHERE id = OLD.fund_id;
    END IF;
  END IF;

  -- ========================================================================
  -- GOAL WITHDRAWAL: Deduct from account, add back to goal saved_amount
  -- ========================================================================
  IF OLD.type = 'goal_withdraw' AND OLD.to_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance - OLD.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = OLD.to_account_id;
    
    IF OLD.fund_id IS NOT NULL THEN
      UPDATE goals
      SET saved_amount = saved_amount + OLD.amount,
          updated_at = TIMEZONE('utc', NOW())
      WHERE id = OLD.fund_id;
    END IF;
  END IF;

  -- ========================================================================
  -- FUND EXPENSE: Add back to goal saved_amount
  -- ========================================================================
  IF OLD.type = 'fund_expense' AND OLD.fund_id IS NOT NULL THEN
    UPDATE goals
    SET saved_amount = saved_amount + OLD.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = OLD.fund_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 4: Consolidated function for UPDATE operations
-- ============================================================================
CREATE OR REPLACE FUNCTION update_balances_on_transaction_update()
RETURNS TRIGGER AS $$
BEGIN
  -- First, revert the old transaction's effect
  -- ========================================================================
  -- Revert OLD expense
  -- ========================================================================
  IF OLD.type = 'expense' AND OLD.from_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance + OLD.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = OLD.from_account_id;
  END IF;

  -- ========================================================================
  -- Revert OLD income
  -- ========================================================================
  IF OLD.type = 'income' AND OLD.to_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance - OLD.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = OLD.to_account_id;
  END IF;

  -- ========================================================================
  -- Revert OLD transfer
  -- ========================================================================
  IF OLD.type = 'transfer' 
     AND OLD.from_account_id IS NOT NULL 
     AND OLD.to_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance + OLD.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = OLD.from_account_id;
    
    UPDATE accounts
    SET balance = balance - OLD.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = OLD.to_account_id;
  END IF;

  -- ========================================================================
  -- Revert OLD goal deposit
  -- ========================================================================
  IF OLD.type = 'goal' AND OLD.from_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance + OLD.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = OLD.from_account_id;
    
    IF OLD.fund_id IS NOT NULL THEN
      UPDATE goals
      SET saved_amount = saved_amount - OLD.amount,
          updated_at = TIMEZONE('utc', NOW())
      WHERE id = OLD.fund_id;
    END IF;
  END IF;

  -- ========================================================================
  -- Revert OLD goal withdrawal
  -- ========================================================================
  IF OLD.type = 'goal_withdraw' AND OLD.to_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance - OLD.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = OLD.to_account_id;
    
    IF OLD.fund_id IS NOT NULL THEN
      UPDATE goals
      SET saved_amount = saved_amount + OLD.amount,
          updated_at = TIMEZONE('utc', NOW())
      WHERE id = OLD.fund_id;
    END IF;
  END IF;

  -- ========================================================================
  -- Revert OLD fund expense
  -- ========================================================================
  IF OLD.type = 'fund_expense' AND OLD.fund_id IS NOT NULL THEN
    UPDATE goals
    SET saved_amount = saved_amount + OLD.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = OLD.fund_id;
  END IF;

  -- Then, apply the new transaction's effect
  -- ========================================================================
  -- Apply NEW expense
  -- ========================================================================
  IF NEW.type = 'expense' AND NEW.from_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance - NEW.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = NEW.from_account_id;
  END IF;

  -- ========================================================================
  -- Apply NEW income
  -- ========================================================================
  IF NEW.type = 'income' AND NEW.to_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance + NEW.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = NEW.to_account_id;
  END IF;

  -- ========================================================================
  -- Apply NEW transfer
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
  -- Apply NEW goal deposit
  -- ========================================================================
  IF NEW.type = 'goal' AND NEW.from_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance - NEW.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = NEW.from_account_id;
    
    IF NEW.fund_id IS NOT NULL THEN
      UPDATE goals
      SET saved_amount = saved_amount + NEW.amount,
          updated_at = TIMEZONE('utc', NOW())
      WHERE id = NEW.fund_id;
    END IF;
  END IF;

  -- ========================================================================
  -- Apply NEW goal withdrawal
  -- ========================================================================
  IF NEW.type = 'goal_withdraw' AND NEW.to_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = balance + NEW.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = NEW.to_account_id;
    
    IF NEW.fund_id IS NOT NULL THEN
      UPDATE goals
      SET saved_amount = saved_amount - NEW.amount,
          updated_at = TIMEZONE('utc', NOW())
      WHERE id = NEW.fund_id;
    END IF;
  END IF;

  -- ========================================================================
  -- Apply NEW fund expense
  -- ========================================================================
  IF NEW.type = 'fund_expense' AND NEW.fund_id IS NOT NULL THEN
    UPDATE goals
    SET saved_amount = saved_amount - NEW.amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = NEW.fund_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 5: Create single set of triggers (no duplicates!)
-- ============================================================================
CREATE TRIGGER trigger_transaction_insert
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_balances_on_transaction_insert();

CREATE TRIGGER trigger_transaction_delete
  AFTER DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION revert_balances_on_transaction_delete();

CREATE TRIGGER trigger_transaction_update
  AFTER UPDATE ON transactions
  FOR EACH ROW
  WHEN (
    OLD.amount IS DISTINCT FROM NEW.amount OR 
    OLD.type IS DISTINCT FROM NEW.type OR
    OLD.from_account_id IS DISTINCT FROM NEW.from_account_id OR
    OLD.to_account_id IS DISTINCT FROM NEW.to_account_id OR
    OLD.fund_id IS DISTINCT FROM NEW.fund_id
  )
  EXECUTE FUNCTION update_balances_on_transaction_update();

-- ============================================================================
-- STEP 6: Update transaction constraints to allow fund_id for goal types
-- ============================================================================
-- This makes fund_id optional for goal/goal_withdraw but allows it for
-- automatic goal saved_amount updates
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_transaction_accounts;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_expense_accounts;

ALTER TABLE transactions ADD CONSTRAINT check_transaction_accounts CHECK (
  (type = 'expense' AND from_account_id IS NOT NULL AND to_account_id IS NULL) OR
  (type = 'income' AND from_account_id IS NULL AND to_account_id IS NOT NULL) OR
  (type = 'transfer' AND from_account_id IS NOT NULL AND to_account_id IS NOT NULL AND from_account_id != to_account_id) OR
  (type = 'goal' AND from_account_id IS NOT NULL AND to_account_id IS NULL) OR
  (type = 'goal_withdraw' AND from_account_id IS NULL AND to_account_id IS NOT NULL) OR
  (type = 'fund_expense' AND fund_id IS NOT NULL AND from_account_id IS NULL AND to_account_id IS NULL)
);

-- ============================================================================
-- MIGRATION NOTES:
-- ============================================================================
-- 1. This script removes duplicate triggers that caused double updates
-- 2. Goal saved_amount is now updated automatically if fund_id is provided
-- 3. For backward compatibility, if fund_id is NULL for goal/goal_withdraw,
--    the app can still use adjust_goal_saved_amount RPC manually
-- 4. To fully automate goal updates, update your app code to include fund_id
--    when creating goal/goal_withdraw transactions
-- ============================================================================

