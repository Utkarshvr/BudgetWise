-- Migration: Parent groups hold funds; child categories spend from the group pool.
-- Run after supabase_categories_parent_migration.sql and supabase_category_reservations_v2.sql

-- Step 1: Merge any existing child reservations into their parent group
DO $$
DECLARE
  rec RECORD;
  parent_reservation category_reservations;
BEGIN
  FOR rec IN
    SELECT
      cr.id,
      cr.user_id,
      cr.category_id,
      cr.account_id,
      cr.reserved_amount,
      cr.currency,
      c.parent_id
    FROM category_reservations cr
    JOIN categories c ON c.id = cr.category_id
    WHERE c.parent_id IS NOT NULL
  LOOP
    SELECT * INTO parent_reservation
    FROM category_reservations
    WHERE category_id = rec.parent_id
      AND account_id = rec.account_id;

    IF FOUND THEN
      UPDATE category_reservations
      SET reserved_amount = reserved_amount + rec.reserved_amount,
          updated_at = TIMEZONE('utc', NOW())
      WHERE id = parent_reservation.id;
    ELSE
      INSERT INTO category_reservations (
        user_id,
        category_id,
        account_id,
        reserved_amount,
        currency
      ) VALUES (
        rec.user_id,
        rec.parent_id,
        rec.account_id,
        rec.reserved_amount,
        rec.currency
      );
    END IF;

    DELETE FROM category_reservations WHERE id = rec.id;
  END LOOP;
END $$;

-- Step 2: Update reservation RPC — only top-level expense categories can hold funds
CREATE OR REPLACE FUNCTION adjust_category_reservation(
  p_category_id UUID,
  p_account_id UUID,
  p_amount_delta BIGINT
)
RETURNS category_reservations AS $$
DECLARE
  v_reservation category_reservations;
  v_category categories;
  v_account accounts;
BEGIN
  SELECT * INTO v_category
  FROM categories
  WHERE id = p_category_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Category not found or access denied';
  END IF;

  IF v_category.category_type <> 'expense' THEN
    RAISE EXCEPTION 'Can only reserve funds for expense categories';
  END IF;

  IF v_category.parent_id IS NOT NULL THEN
    RAISE EXCEPTION 'Child categories use their group''s funds. Manage funds on the parent group instead.';
  END IF;

  SELECT * INTO v_account
  FROM accounts
  WHERE id = p_account_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found or access denied';
  END IF;

  SELECT * INTO v_reservation
  FROM category_reservations
  WHERE category_id = p_category_id AND account_id = p_account_id;

  IF NOT FOUND THEN
    IF p_amount_delta < 0 THEN
      RAISE EXCEPTION 'Cannot create reservation with negative amount';
    END IF;

    INSERT INTO category_reservations (
      user_id,
      category_id,
      account_id,
      reserved_amount,
      currency
    ) VALUES (
      auth.uid(),
      p_category_id,
      p_account_id,
      p_amount_delta,
      v_account.currency
    ) RETURNING * INTO v_reservation;
  ELSE
    IF v_reservation.reserved_amount + p_amount_delta < 0 THEN
      RAISE EXCEPTION 'Insufficient reserved balance';
    END IF;

    UPDATE category_reservations
    SET reserved_amount = reserved_amount + p_amount_delta,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = v_reservation.id
    RETURNING * INTO v_reservation;
  END IF;

  RETURN v_reservation;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON COLUMN categories.is_parent_category IS 'True if this category is a group that can contain child categories and hold shared reserved funds.';
COMMENT ON COLUMN categories.parent_id IS 'Reference to parent group. Child categories spend from the parent group''s reserved funds.';
