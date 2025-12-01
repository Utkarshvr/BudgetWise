# Fund Categories Implementation Guide

## Overview

Fund tracking now lives inside **Categories**. Each category can behave either as a regular label or as a **fund category** that carries its own budget balance. This keeps the experience focused on “how much of this account is already spoken for” without shuffling money between hidden accounts or goals.

## What’s New

1. **Category Types**
   - `regular`: behaves exactly like the old system (pure tagging)
   - `fund`: keeps track of an allocated balance, tied to a specific account/currency

2. **Funding Workflow**
   - When creating/editing a category, choose “Fund Category”
   - Pick the source account and optionally set an initial allocation
   - Allocate/withdraw later from the Categories screen (no money actually leaves the real account; it’s a label that reserves part of the balance)

3. **Transaction Workflow**
   - Selecting a fund category on the Add Transaction screen automatically enforces:
     - Matching account (you must spend from the account that owns the fund)
     - Amount ≤ remaining balance
     - After logging the expense, the fund balance is reduced via `adjust_category_fund_balance`

4. **Live Budget Insight**
   - Category cards show current fund balance + linked account
   - Add Transaction screen surfaces remaining budget while you type

## Database Changes

### Categories Table (`sql/supabase_category_funds_migration.sql`)
New columns:
| Column | Description |
| --- | --- |
| `category_type` | `regular` or `fund` |
| `fund_balance` | Current budget (smallest currency unit) |
| `fund_currency` | Currency of the allocation |
| `fund_account_id` | Account this fund belongs to |

Helper function:
```sql
adjust_category_fund_balance(p_category_id UUID,
                             p_amount_delta BIGINT,
                             p_account_id UUID DEFAULT NULL)
```
- Validates ownership + category type
- Positive delta allocates funds (ties account/currency on first allocation)
- Negative delta withdraws/spend; prevents negative balances

### Transactions Table
No new columns required. We simply insert normal `expense` rows and then adjust the category balance via the function above. This keeps historical transactions intact while fund balances stay synced.

## Frontend Highlights

### Categories Screen (`src/screens/categories/CategoriesScreen.tsx`)
- Shows badges for fund categories
- Displays fund balance + linked account
- “Allocate” / “Withdraw” actions call the RPC above
- Category form lets users toggle type, choose account, and set an optional initial allocation

### Category Form Sheet (`src/screens/categories/components/CategoryFormSheet.tsx`)
- Accepts the accounts list from the parent
- Validates that fund categories have a source account
- Offers optional initial funding when creating a new fund category

### Add Transaction Screen (`src/screens/transactions/AddTransactionScreen.tsx`)
- Automatically locks the account picker to the fund’s account
- Shows remaining budget when a fund category is selected
- Blocks spending more than the reserved amount
- After saving the expense, updates the category balance (and rolls back the transaction if the RPC fails)

### Category Picker (`src/screens/transactions/components/CategorySelectSheet.tsx`)
- Highlights fund categories and displays their remaining balance

## Example Flow

### Clothing Envelope
1. Create category “Clothing 👕”
2. Pick “Fund Category”, choose “HDFC Salary” account, allocate ₹40,000
3. Fund card now shows “₹40,000 remaining”
4. Log an expense for ₹3,000 using account “HDFC Salary” + category “Clothing”
5. Submission succeeds → fund balance becomes ₹37,000

### Groceries (Regular Category)
1. Create category “Groceries 🥑” (regular)
2. No accounts or balances attached
3. Expenses tagged with Groceries behave exactly like before

## How to Deploy

1. Run migrations in order:
   - `sql/supabase_category_funds_migration.sql`
   - (Optional) `sql/fix_goals_fund_type_constraint.sql` if earlier constraint errors persist

2. Rebuild the app / reload metro bundler

3. Test flows:
   - Create fund + regular categories
   - Allocate / withdraw funds
   - Log expenses with both types
   - Ensure validation prevents overspending

## Future Enhancements
- Account-level “available vs allocated” views
- Fund history per category
- Automation rules (monthly top-ups)
- Shared budget notifications

---

**Implementation Date**: November 2025  
**Status**: ✅ Fund categories live across Categories + Transactions

