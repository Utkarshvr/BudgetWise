-- Migration to add fund-support to categories

-- Step 1: Add fund-specific columns to categories
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS category_type TEXT NOT NULL DEFAULT 'regular'
    CHECK (category_type IN ('regular', 'fund')),
  ADD COLUMN IF NOT EXISTS fund_balance BIGINT NOT NULL DEFAULT 0
    CHECK (fund_balance >= 0),
  ADD COLUMN IF NOT EXISTS fund_currency TEXT,
  ADD COLUMN IF NOT EXISTS fund_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS categories_type_idx ON categories(category_type);
CREATE INDEX IF NOT EXISTS categories_fund_account_idx ON categories(fund_account_id);

COMMENT ON COLUMN categories.category_type IS 'regular categories behave like labels, fund categories track allocated budgets';
COMMENT ON COLUMN categories.fund_balance IS 'Current allocated budget balance (stored in smallest currency unit)';
COMMENT ON COLUMN categories.fund_currency IS 'Currency of the allocated budget, derived from the first account used';
COMMENT ON COLUMN categories.fund_account_id IS 'Account whose balance this fund conceptually belongs to';

-- Step 2: Ensure existing rows have valid data
UPDATE categories
SET category_type = 'regular'
WHERE category_type IS NULL;

UPDATE categories
SET fund_balance = 0
WHERE fund_balance IS NULL;

-- Step 3: Helper function to safely adjust fund balances
CREATE OR REPLACE FUNCTION adjust_category_fund_balance(
  p_category_id UUID,
  p_amount_delta BIGINT,
  p_account_id UUID DEFAULT NULL
)
RETURNS categories AS $$
DECLARE
  v_category categories;
  v_account accounts;
  v_updated categories;
BEGIN
  -- Fetch category and ensure ownership
  SELECT * INTO v_category
  FROM categories
  WHERE id = p_category_id
    AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Category not found or access denied';
  END IF;

  IF v_category.category_type <> 'fund' THEN
    RAISE EXCEPTION 'Cannot adjust balance for non-fund category';
  END IF;

  IF p_amount_delta > 0 THEN
    -- Funding requires an account reference
    IF p_account_id IS NULL THEN
      RAISE EXCEPTION 'Account is required when adding funds';
    END IF;

    SELECT * INTO v_account
    FROM accounts
    WHERE id = p_account_id
      AND user_id = auth.uid();

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Account not found or access denied';
    END IF;

    -- If this is the first time funding, capture account + currency
    IF v_category.fund_account_id IS NULL THEN
      UPDATE categories
      SET fund_balance = fund_balance + p_amount_delta,
          fund_account_id = p_account_id,
          fund_currency = v_account.currency,
          updated_at = TIMEZONE('utc', NOW())
      WHERE id = p_category_id
      RETURNING * INTO v_updated;
    ELSE
      IF v_category.fund_account_id <> p_account_id THEN
        RAISE EXCEPTION 'Funds for this category are tied to a different account';
      END IF;

      IF v_category.fund_currency IS NOT NULL AND v_category.fund_currency <> v_account.currency THEN
        RAISE EXCEPTION 'Account currency mismatch. Use the original account currency.';
      END IF;

      UPDATE categories
      SET fund_balance = fund_balance + p_amount_delta,
          updated_at = TIMEZONE('utc', NOW())
      WHERE id = p_category_id
      RETURNING * INTO v_updated;
    END IF;
  ELSE
    -- Withdraw or spend
    IF v_category.fund_balance + p_amount_delta < 0 THEN
      RAISE EXCEPTION 'Insufficient fund balance';
    END IF;

    UPDATE categories
    SET fund_balance = fund_balance + p_amount_delta,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = p_category_id
    RETURNING * INTO v_updated;
  END IF;

  RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION adjust_category_fund_balance(UUID, BIGINT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION adjust_category_fund_balance(UUID, BIGINT, UUID) TO authenticated;


