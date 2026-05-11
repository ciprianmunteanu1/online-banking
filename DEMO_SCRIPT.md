# Demo Script

This script demonstrates the implemented online banking platform from a clean local run.

## 1. Starting The System

User: local developer.

Run:

```bash
cd backend
docker compose up -d
npx prisma generate
npx prisma db push
npx prisma db seed
npm run start:dev
```

In another terminal:

```bash
cd frontend
npm run dev
```

Expected result: backend listens on `http://localhost:3000`; frontend opens on the Vite URL, usually `http://localhost:5173`.

## 2. Logging In As Demo User

User: `demo@bank.local` / `Password123!`.

In the UI, open the frontend URL, enter the demo credentials, and click sign in.

Expected result: the app navigates to the MFA page.

## 3. MFA Flow

User: demo.

Copy the OTP from the backend terminal line similar to `[MFA mock] OTP for demo@bank.local: 123456`. Enter it on the MFA page.

Expected result: the dashboard opens.

## 4. Dashboard And Accounts Overview

User: demo.

Click `Dashboard`.

Expected result: visible non-system accounts, balances, account types, KYC status, and recent transactions. System/internal settlement accounts should not appear.

## 5. Internal Transfer Between Own Accounts

User: demo.

Click `Transfer`, select `Between my accounts`, choose a source and destination account, enter a small amount such as `10`, add an optional description, and click `Send Transfer`.

Expected result: success message with `transactionId` and `ledgerBalanced`.

Optional SQL:

```bash
cd backend
docker compose exec -T postgres psql -U admin -d online_banking -c \
  "SELECT id, type, status, amount, currency, created_at FROM transactions ORDER BY created_at DESC LIMIT 5;"
```

## 6. Transaction History

User: demo.

Click `History`. Expand recent rows if available.

Expected result: posted transactions are listed with ledger detail showing debit and credit rows.

## 7. Ledger Invariant Verification

User: local developer.

Run:

```bash
cd backend
docker compose exec -T postgres psql -U admin -d online_banking -c \
  "SELECT transaction_id, COUNT(*) AS n FROM ledger_entries GROUP BY transaction_id HAVING COUNT(*) <> 2;"
```

Expected result: no rows.

## 8. Beneficiaries

User: demo.

Add beneficiary:

1. Click `Beneficiaries`.
2. Add a display name and IBAN.
3. For an internal beneficiary, use another active account IBAN from the database.
4. For an external beneficiary, use an IBAN that does not match any internal account.

Expected result: beneficiary appears in the list.

Transfer to internal beneficiary:

1. Click `Transfer`.
2. Select `To beneficiary`.
3. Choose the internal beneficiary.
4. Enter a small amount and submit.

Expected result: transfer posts; sender and receiver notifications are created for an internal matched account.

Transfer to external beneficiary:

1. Click `Transfer`.
2. Select `To beneficiary`.
3. Choose the external beneficiary.
4. Enter a small amount and submit.

Expected result: transfer posts through the external settlement route.

Delete beneficiary:

1. Return to `Beneficiaries`.
2. Delete/archive the beneficiary.

Expected result: the beneficiary is removed from normal active list behavior.

## 9. Merchant Payments

User: demo.

List merchants:

1. Click `Pay Merchant`.
2. Open the merchant dropdown.

Expected result: `Mega Market`, `Uni Cafe`, and `BookHub` are available.

Pay merchant:

1. Select a checking/source account.
2. Select `Mega Market`.
3. Enter `5`.
4. Add description `Groceries`.
5. Click `Pay`.

Expected result: success message with `transactionId` and `ledgerBalanced`.

Optional SQL:

```bash
cd backend
docker compose exec -T postgres psql -U admin -d online_banking -c \
  "SELECT id, type, status, amount, currency FROM transactions WHERE type='MERCHANT_PAYMENT' ORDER BY created_at DESC LIMIT 5;"
```

## 10. Step-Up Authentication

User: demo.

Initiate high-value payment or transfer:

1. Click `Transfer` or `Pay Merchant`.
2. Enter an amount greater than `1000`.
3. Submit.

Expected result: step-up modal appears.

Confirm step-up:

1. Copy the OTP from backend logs.
2. Enter it in the modal.
3. Click confirm.

Expected result: the original operation posts once, with a success result.

## 11. Cards

User: demo.

View cards:

1. Click `Cards`.

Expected result: existing cards are listed.

Issue new card:

1. Click `Issue New Card`.
2. Choose account and card type.
3. Submit.

Expected result: new card appears if KYC is verified.

Block card:

1. Click block on an active card.

Expected result: card status becomes blocked.

Unblock card:

1. Click unblock on a blocked card.

Expected result: card status becomes active if KYC is verified.

Reveal card details:

1. Click reveal/initiate.
2. Copy OTP from backend logs.
3. Enter OTP.

Expected result: simulated PAN, expiry, and CVV are shown temporarily.

Close card:

1. Click close.
2. Confirm.

Expected result: card is closed and no longer usable.

## 12. Statements

User: demo.

1. Click `Statements`.
2. Select an account and date range.
3. Generate/view statement.

Expected result: opening balance, closing balance, and transaction rows are shown.

Export CSV:

1. Click CSV export.

Expected result: browser downloads or opens a CSV export for the selected statement.

## 13. Notifications

User: demo.

Notification page:

1. Click `Notifications`.

Expected result: account/security/payment notifications are listed.

Mark read:

1. Click mark read on an unread notification.

Expected result: notification becomes read.

Mark all read:

1. Click mark all read.

Expected result: all notifications become read.

Cross-tab toast behavior:

1. Open the app in two tabs as the same user.
2. Trigger an action that creates a notification, such as a transfer or merchant payment.

Expected result: toast appears through the polling/cross-tab notification behavior.

## 14. Sessions And Devices

User: demo.

View sessions:

1. Click `Security`.

Expected result: current and historical sessions are shown with device/user agent, IP, dates, and status.

Revoke non-current session:

1. Login in another browser/profile to create another active session.
2. Return to `Security`.
3. Revoke the non-current session.

Expected result: revoked session shows revoked/inactive.

## 15. Admin

User: `admin@bank.local` / `Password123!`.

Login and MFA:

1. Sign out from demo.
2. Login as admin.
3. Copy MFA OTP from backend logs.

View customers:

1. Click `Admin`.

Expected result: customer list with KYC status and accounts.

Verify/reject KYC:

1. Use verify or reject buttons on a customer.

Expected result: KYC status changes and an audit event is created.

Credit account:

1. Enter a RON amount next to a customer account.
2. Click credit.

Expected result: admin credit transaction posts with ledger entries.

View audit events:

1. Open `/admin/audit` or click `Audit`.

Expected result: latest audit events are listed.

Filter audit events:

1. Enter `SESSION_REVOKED`, `MERCHANT_PAYMENT_POSTED`, or another action.
2. Apply filters.

Expected result: filtered audit events are shown.

## 16. Access Control

User: demo.

Open `/admin/customers` or `/admin/audit`.

Expected result: normal user receives an admin access/forbidden error.

## 17. Rate Limiting

User: local developer.

Send repeated failed login requests quickly:

```bash
for i in {1..12}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"demo@bank.local","password":"wrong"}'
done
```

Expected result: later requests return `429`.

## 18. Final SQL Checks

Balances:

```bash
cd backend
docker compose exec -T postgres psql -U admin -d online_banking -c \
  "SELECT iban, account_type, is_system, available_balance, currency FROM accounts ORDER BY opened_at DESC LIMIT 20;"
```

Latest transactions:

```bash
cd backend
docker compose exec -T postgres psql -U admin -d online_banking -c \
  "SELECT id, type, status, amount, currency, created_at FROM transactions ORDER BY created_at DESC LIMIT 20;"
```

Ledger invariant:

```bash
cd backend
docker compose exec -T postgres psql -U admin -d online_banking -c \
  "SELECT transaction_id, COUNT(*) AS n FROM ledger_entries GROUP BY transaction_id HAVING COUNT(*) <> 2;"
```

Expected result for invariant: no rows.

## 19. Shutdown Instructions

Stop app processes with `Ctrl+C`.

Stop Docker services without deleting data:

```bash
cd backend
docker compose stop
```

Only delete DB/Redis volumes if you intentionally want a reset:

```bash
cd backend
docker compose down -v
```
