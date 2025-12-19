Is this idea good?
Yes — lending/borrowing is a real need, but the key is: it’s not an Expense/Income. It’s a balance-sheet movement (you exchange cash for a receivable, or you receive cash and create a payable). If you model it as expense/income, your stats/budgets will be wrong.
Best core model (fits your current app): treat it as a special “Transfer”
Your DB + triggers already support transfer cleanly, so the simplest and most correct approach is:
Lent money (you gave cash) = transfer from your cash/bank account → “Receivable” (money owed to you)
Borrowed money (you received cash) = transfer from “Payable” (money you owe) → your cash/bank account
Repayment received = transfer from Receivable → your cash/bank
Repayment paid = transfer from your cash/bank → Payable
Result: your cash balance is correct, and your outstanding lent/borrowed is simply the balance of those internal accounts (and supports partial repayments naturally).
UX flow (what the user sees)
Instead of forcing people to think “transfer”, add a friendly wrapper:
Add Transaction → “Loan / Debt”
Choose Lent or Borrowed
Choose Person (optional in MVP), Amount, Date, Note
Choose Account (the real cash/bank account involved)
Under the hood you create a transfer with the right from/to accounts.
Loans screen
Tabs: You’ll receive (Receivables) / You owe (Payables)
Each item shows: person, outstanding, last activity
Actions: Record repayment, Mark as settled (when outstanding hits 0), Write off (optional)
MVP vs “proper” version
MVP (fast, minimal schema):
Create 2 internal accounts: Receivable and Payable (even if they are normal account types for now)
Store the person name in note like @Rohit - lent for trip
Loans screen groups by parsing person tag (good enough early, but a bit hacky)
Proper (clean, scalable):
Add counterparties table (people)
Add loan_positions (direction lent/borrow, counterparty_id, currency, optional due date)
Each repayment/disbursement is a row linked to a transactions.id
This enables: due dates, reminders, interest, clean grouping, no note-parsing
Important edge-case rules
Interest received: record as a normal Income (category “Interest”) into your cash account (not as a transfer).
Debt forgiven / write-off:
If someone won’t repay: reduce Receivable via an Expense (counts as a loss).
Avoid category/budget impact: loan transfers should not require categories.
Quick questions to pick the right version
Do you need per-person totals (like “Rohit owes me 2,300”)?
Do you want due dates / reminders in the first version?
Should loans appear in Stats as spending/income (I strongly recommend no)?
If you answer those, I’ll suggest the exact MVP scope + the cleanest upgrade path to the “proper” model later without painful migration.
