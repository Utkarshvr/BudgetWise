# Migration Guide: Fix Transaction Balance Update Issues

## Problem Summary

The database had multiple issues causing incorrect balance calculations:

1. **Duplicate Triggers**: Two sets of triggers (`update_account_balance_on_transaction_insert` and `transaction_balance_update`) both fired on INSERT, causing double balance updates
2. **Missing Goal Updates**: Triggers didn't update `goals.saved_amount` for `goal`/`goal_withdraw` transactions, requiring manual RPC calls that could fail or be skipped
3. **Inconsistent Functions**: Multiple migration files replaced the same functions with different implementations, causing confusion

## Solution

The new consolidated schema (`supabase_transactions_schema_fixed.sql`) provides:

1. **Single Set of Triggers**: Only one trigger per operation (INSERT, UPDATE, DELETE)
2. **Automatic Goal Updates**: Triggers now update `goals.saved_amount` automatically when `fund_id` is provided
3. **Consolidated Functions**: All transaction types handled in single, well-organized functions
4. **Backward Compatibility**: If `fund_id` is NULL for goal transactions, manual RPC calls still work

## Migration Steps

### Step 1: Backup Your Database
```sql
-- Always backup before running migrations!
```

### Step 2: Run the Fixed Schema
Execute `sql/supabase_transactions_schema_fixed.sql` in your Supabase SQL editor.

This script will:
- Drop all existing duplicate triggers
- Create new consolidated trigger functions
- Create new single set of triggers
- Update constraints to allow `fund_id` for goal transactions

### Step 3: Verify Triggers
```sql
-- Check that only the new triggers exist
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'transactions'
ORDER BY trigger_name;
```

You should see only:
- `trigger_transaction_insert`
- `trigger_transaction_delete`
- `trigger_transaction_update`
- `update_transactions_updated_at` (for timestamp updates)

### Step 4: Test Transaction Creation
Create a test transaction and verify:
1. Account balance updates correctly (once, not twice)
2. If `fund_id` is provided for goal transactions, goal `saved_amount` updates automatically

## Application Code Updates (Recommended)

### Update Goal Deposit/Withdraw to Include fund_id

**Before:**
```typescript
const transactionPayload = {
  user_id: session.user.id,
  note: `Goal: ${goal.title} (Save)`,
  type: "goal" as const,
  amount: amountSmallest,
  from_account_id: actionAccountId,
  to_account_id: null,
  currency: selectedAccount.currency,
};

await supabase.from("transactions").insert(transactionPayload);

// Manual RPC call
await supabase.rpc("adjust_goal_saved_amount", {
  goal_id: goal.id,
  amount_delta: amountSmallest,
});
```

**After:**
```typescript
const transactionPayload = {
  user_id: session.user.id,
  note: `Goal: ${goal.title} (Save)`,
  type: "goal" as const,
  amount: amountSmallest,
  from_account_id: actionAccountId,
  to_account_id: null,
  fund_id: goal.id, // Add this!
  currency: selectedAccount.currency,
};

// Single insert - trigger handles both account and goal updates
await supabase.from("transactions").insert(transactionPayload);

// No need for manual RPC call anymore!
```

### Benefits of Including fund_id

1. **Atomic Operations**: Account and goal updates happen in the same transaction
2. **No Race Conditions**: No risk of transaction succeeding but RPC failing
3. **Simpler Code**: One database call instead of two
4. **Automatic Rollback**: If transaction fails, goal update is automatically reverted

## Backward Compatibility

The solution maintains backward compatibility:
- If `fund_id` is NULL for `goal`/`goal_withdraw` transactions, triggers only update account balances
- You can still use `adjust_goal_saved_amount` RPC manually if needed
- Existing transactions without `fund_id` continue to work

## Verification Queries

### Check for Duplicate Balance Updates
```sql
-- This should return 0 rows (no duplicate triggers)
SELECT 
  trigger_name,
  COUNT(*) as count
FROM information_schema.triggers
WHERE event_object_table = 'transactions'
  AND event_manipulation = 'INSERT'
GROUP BY trigger_name
HAVING COUNT(*) > 1;
```

### Verify Goal Updates Work
```sql
-- Test: Create a goal transaction with fund_id
-- Then check if goal saved_amount was updated
SELECT 
  t.id,
  t.type,
  t.amount,
  t.fund_id,
  g.saved_amount as goal_saved_amount
FROM transactions t
LEFT JOIN goals g ON t.fund_id = g.id
WHERE t.type IN ('goal', 'goal_withdraw')
ORDER BY t.created_at DESC
LIMIT 10;
```

## Rollback Plan

If you need to rollback:

1. The old trigger functions may still exist (they were replaced, not dropped)
2. You can recreate the old triggers if needed
3. However, the duplicate trigger issue will return

**Recommended**: Fix the root cause rather than rolling back.

## Questions?

If you encounter issues:
1. Check trigger logs in Supabase dashboard
2. Verify transaction constraints are correct
3. Ensure `fund_id` references valid goal IDs
4. Check that account/goal balances match expected values

