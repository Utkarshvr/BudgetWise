-- Migration: Add archive support to categories
-- This migration adds an is_archived column to the categories table
-- to support archiving categories instead of deleting them

-- Add is_archived column with default value false
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false NOT NULL;

-- Create index on is_archived for faster queries
CREATE INDEX IF NOT EXISTS categories_is_archived_idx ON categories(is_archived);

-- Update existing categories to have is_archived = false (should already be default, but just in case)
UPDATE categories SET is_archived = false WHERE is_archived IS NULL;

-- ============================================================================
-- Unique constraint: (user_id, name, category_type) for non-archived categories
-- ============================================================================
-- This ensures that within a user's categories, the combination of (name, type)
-- is unique for active (non-archived) categories.
-- Archived categories can have duplicate names/types, but when restored,
-- they will conflict if an active category with the same (name, type) exists.
-- ============================================================================
-- Create a partial unique index (only applies to non-archived categories)
CREATE UNIQUE INDEX IF NOT EXISTS categories_unique_name_type_per_user_idx
ON categories (user_id, LOWER(name), category_type)
WHERE is_archived = false;

COMMENT ON INDEX categories_unique_name_type_per_user_idx IS 
'Ensures uniqueness of (name, category_type) combination per user for active categories only. Case-insensitive name matching.';

-- ============================================================================
-- Trigger function to handle category archiving
-- ============================================================================
-- When a category is archived (is_archived changes from false to true):
-- 1. Returns fund_balance to the account's free to plan amount
-- 2. Deletes all category_reservations (freeing reserved amounts)
-- 3. Resets fund-related fields
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_category_archive()
RETURNS TRIGGER AS $$
DECLARE
  v_account_id UUID;
  v_fund_balance BIGINT;
BEGIN
  -- Only process when is_archived changes from false to true
  IF OLD.is_archived = false AND NEW.is_archived = true THEN
    
    -- 1. Handle legacy fund balance: return money to account if exists
    IF OLD.fund_balance IS NOT NULL AND OLD.fund_balance > 0 AND OLD.fund_account_id IS NOT NULL THEN
      v_account_id := OLD.fund_account_id;
      v_fund_balance := OLD.fund_balance;
      
      -- Add fund balance back to account's free to plan amount
      UPDATE accounts
      SET balance = balance + v_fund_balance,
          updated_at = TIMEZONE('utc', NOW())
      WHERE id = v_account_id
        AND user_id = auth.uid();
    END IF;
    
    -- 2. Delete all category reservations (this frees up reserved amounts in accounts)
    DELETE FROM category_reservations
    WHERE category_id = NEW.id
      AND user_id = auth.uid();
    
    -- 3. Reset fund-related fields
    NEW.fund_balance := 0;
    NEW.fund_account_id := NULL;
    NEW.fund_currency := NULL;
    NEW.fund_target_amount := NULL;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to fire before update on categories
DROP TRIGGER IF EXISTS trigger_category_archive ON categories;
CREATE TRIGGER trigger_category_archive
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION handle_category_archive();

-- Grant execute permission
REVOKE ALL ON FUNCTION handle_category_archive() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION handle_category_archive() TO authenticated;

COMMENT ON FUNCTION handle_category_archive() IS 'Automatically handles fund balance returns and reservation cleanup when a category is archived';

