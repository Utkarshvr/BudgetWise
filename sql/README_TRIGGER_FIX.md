# Transaction Trigger Fix - Quick Reference

## 🚨 Problem
Your account balances are being updated **twice** due to duplicate triggers, causing incorrect calculations especially for withdrawals and savings.

## ✅ Solution
Use the **fixed schema** file to replace all triggers with a single, consolidated set.

## 📁 Files

### Apply This File:
- **`supabase_transactions_schema_fixed.sql`** ← **RUN THIS IN SUPABASE**

### Documentation:
- **`TRIGGER_FIX_SUMMARY.md`** - Overview of issues and solution
- **`MIGRATION_GUIDE_FIX_TRIGGERS.md`** - Step-by-step instructions
- **`README_TRIGGER_FIX.md`** - This file (quick reference)

### Original Files (for reference):
- `supabase_transactions_schema.sql` - Original (has issues, don't use)
- `supabase_funds_enhancement_migration.sql` - Created duplicate triggers
- `supabase_transactions_goal_migration.sql` - Missing goal updates

## 🚀 Quick Start

1. **Backup your database** (always!)

2. **Run the fixed schema:**
   ```sql
   -- Copy and paste the entire contents of:
   -- sql/supabase_transactions_schema_fixed.sql
   -- into Supabase SQL Editor and execute
   ```

3. **Verify triggers:**
   ```sql
   SELECT trigger_name 
   FROM information_schema.triggers 
   WHERE event_object_table = 'transactions';
   ```
   Should show only: `trigger_transaction_insert`, `trigger_transaction_delete`, `trigger_transaction_update`, `update_transactions_updated_at`

4. **Test a transaction** - balances should update once, not twice

## 💡 Optional: Update App Code

To fully automate goal updates, include `fund_id` when creating goal transactions:

```typescript
// Before (manual RPC call needed)
await supabase.from("transactions").insert({
  type: "goal",
  from_account_id: accountId,
  // ... other fields
});
await supabase.rpc("adjust_goal_saved_amount", { ... });

// After (automatic via trigger)
await supabase.from("transactions").insert({
  type: "goal",
  from_account_id: accountId,
  fund_id: goalId, // Add this!
  // ... other fields
});
// No RPC call needed - trigger handles it!
```

## ⚠️ Important Notes

- The fix is **backward compatible** - existing code will still work
- If `fund_id` is NULL for goal transactions, you can still use manual RPC calls
- All transaction types are now handled consistently
- No more double updates!

## 🐛 Still Having Issues?

1. Check that duplicate triggers were removed
2. Verify transaction constraints are correct
3. Ensure `fund_id` references valid goal IDs (if using automatic goal updates)
4. Review the migration guide for detailed troubleshooting

