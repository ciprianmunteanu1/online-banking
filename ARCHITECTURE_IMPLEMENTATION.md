# Architecture Implementation

This document maps the proposed online banking architecture to the actual implementation in this repository.

## Module Overview

| Area | Frontend | Backend | Data |
| --- | --- | --- | --- |
| Auth and MFA | Login, MFA, register pages | `AuthController`, `AuthService` | `User`, `Role`, `Session`, Redis OTP |
| Accounts | Dashboard | `AccountsController`, `AccountsService` | `CustomerProfile`, `Account` |
| Payments and ledger | Transfer page | `PaymentsController`, `PaymentsService` | `Transaction`, `LedgerEntry`, `IdempotencyKey` |
| Beneficiaries | Beneficiaries page | `BeneficiariesController`, `BeneficiariesService` | `Beneficiary` |
| Merchants | Merchant payment page | `MerchantsController`, `MerchantsService`, `PaymentsService` | `Merchant`, settlement `Account` |
| Cards | Cards page | `CardsController`, `CardsService` | `Card`, Redis reveal OTP |
| Statements | Statements page | `StatementsController`, `StatementsService` | `Account`, `Transaction`, `LedgerEntry` |
| Notifications | Notifications page, toasts | `NotificationsController`, `NotificationsService` | `Notification` |
| Sessions/devices | Security page | `AuthController`, `AuthService`, JWT strategy | `Session` |
| Admin and audit | Admin customers, audit pages | `AdminController`, `AdminService` | `AuditEvent`, customer/account models |
| Security hardening | API error handling in client | Nest guards, throttler, CORS | JWT, bcrypt, Redis, audit rows |

## Frontend Pages And Routes

- `/`: login.
- `/register`: user registration.
- `/mfa`: mock MFA OTP confirmation.
- `/dashboard`: account overview and recent transactions.
- `/transfer`: own-account and beneficiary transfers.
- `/merchants/pay`: merchant payments.
- `/transactions`: transaction history and ledger details.
- `/beneficiaries`: beneficiary CRUD.
- `/cards`: card issue/block/unblock/close/reveal.
- `/statements`: account statements and CSV export.
- `/notifications`: notification list and read controls.
- `/security`: sessions/devices management.
- `/admin/customers`: admin customer/KYC/funding page.
- `/admin/audit`: admin audit events page.

API clients live in `frontend/src/api/*`. Auth state is stored in browser session storage through `AuthContext`.

## Backend Modules, Controllers, Services

- `auth`: registration, login, MFA, JWT identity, `/auth/me`, sessions listing/revocation.
- `accounts`: returns user-owned non-system accounts.
- `payments`: own transfers, beneficiary transfers, merchant payments, step-up confirmation, idempotency, ledger writes.
- `beneficiaries`: customer beneficiary CRUD.
- `merchants`: active merchant listing.
- `cards`: card lifecycle and secure reveal flow.
- `statements`: statement generation and CSV export.
- `transactions`: transaction history and ledger detail.
- `notifications`: notification listing, read/read-all, creation helper.
- `admin`: customer list, KYC decisions, admin account crediting, audit event search.
- `redis`: Redis client wrapper for MFA, step-up, and card reveal temporary state.
- `prisma`: Prisma service and database access.

## Database Models

Core identity and access:

- `User`, `Role`, `Session`, `AuditEvent`.

Customer banking:

- `CustomerProfile`, `Account`, `Beneficiary`, `Card`, `Merchant`.

Money movement:

- `Transaction`, `LedgerEntry`, `IdempotencyKey`.

User communication:

- `Notification`.

Important flags:

- `Account.isSystem` separates internal settlement accounts from normal customer APIs.
- `CustomerProfile.kycStatus` gates transfers and card-sensitive actions.
- `Session.revokedAt` supports soft session revocation.
- `Merchant.status` controls active merchant visibility and payments.

## Security Mechanisms

- Passwords are hashed with bcrypt.
- Login creates a short-lived pre-MFA JWT.
- MFA OTP is stored temporarily in Redis and printed in backend logs for demo.
- MFA-verified JWTs protect customer and admin APIs.
- `JwtAuthGuard` validates tokens.
- `MfaVerifiedGuard` blocks pre-MFA tokens from protected actions.
- `RolesGuard` protects admin routes.
- KYC checks run before transfers, merchant payments, and card issuing/reactivation.
- `@nestjs/throttler` applies global and stricter endpoint rate limits.
- Sensitive payment writes require `x-idempotency-key`.
- Audit events are created for important actions.

## Payment And Ledger Flow

Payment types include own transfers, beneficiary transfers, merchant payments, and admin credits.

For normal customer money movement:

1. Controller receives a protected request.
2. Service validates MFA-authenticated user, KYC, account ownership, active status, non-system source account, currency, and amount.
3. Service checks idempotency key.
4. Step-up is required for amounts greater than `1000`.
5. A serializable Prisma transaction updates balances.
6. A `Transaction` row is created.
7. Exactly two `LedgerEntry` rows are created: one `DEBIT`, one `CREDIT`.
8. Idempotency response is completed.
9. Audit and notification records are created.

The ledger invariant check is:

```sql
SELECT transaction_id, COUNT(*) AS n
FROM ledger_entries
GROUP BY transaction_id
HAVING COUNT(*) <> 2;
```

Expected result: no rows.

## Idempotency Flow

- Client sends `x-idempotency-key` for sensitive payment actions.
- Backend stores the key in `IdempotencyKey` with a request hash.
- If the same key and same payload is repeated after success, the stored response is returned.
- If the same key is reused with a different payload, the request is rejected.
- This prevents duplicate charges caused by retries or double-submits.

## Step-Up Flow

- Payments over `1000 RON` call the mock fraud/step-up check.
- Backend creates a Redis challenge containing request data, idempotency key, and OTP.
- API returns `STEP_UP_REQUIRED`.
- Frontend shows an OTP modal.
- User copies OTP from backend logs.
- `/payments/confirm-step-up` replays the stored operation with fraud check skipped.
- The original idempotency key still prevents duplicate posting.

## Notifications Flow

- Backend creates `Notification` rows for important events such as registration, KYC decisions, transfers, merchant payments, admin credits, and incoming internal transfers.
- Frontend polls notifications regularly.
- The notification page supports list, mark read, and mark all read.
- Toasts show recent events and coordinate across tabs.

## Sessions Flow

- Completing MFA creates a durable `Session` row.
- The JWT includes the session id.
- JWT validation checks that the session still exists, is not revoked, and has not expired.
- `/auth/sessions` returns the user’s own sessions.
- `/auth/sessions/:id` soft-revokes a user-owned session with `revokedAt`.

## Admin And Audit Flow

- Admin endpoints use JWT, MFA, roles guard, and `ADMIN` role metadata.
- Admin customer page lists customers and non-system accounts.
- KYC verify/reject updates customer state and creates audit/notification records.
- Admin credit uses a system settlement account and posts double-entry ledger rows.
- Audit page calls `/admin/audit-events` with filters for action, resource type, actor, date range, page, and limit.

## Merchant Payment Flow

- Seed creates three active merchants: Mega Market, Uni Cafe, and BookHub.
- Each merchant points to a system merchant settlement account.
- `/merchants` returns active merchants.
- `/payments/pay-merchant` validates user, KYC, source account, merchant status, amount, currency, and idempotency.
- The serializable transaction debits the customer account, credits the merchant settlement account, creates a `MERCHANT_PAYMENT` transaction, creates two ledger rows, writes audit, and notifies the payer.

## Match To The Architecture Document

The implementation follows the proposed modular layered architecture:

- React frontend is separated from NestJS backend.
- Backend modules map to the planned subsystems: auth, accounts, payments/ledger, cards, statements, notifications, admin/audit, and security.
- PostgreSQL is the durable system of record.
- Prisma models implement the domain model described in the architecture document.
- Redis stores short-lived MFA, step-up, and card reveal state.
- JWT, MFA, RBAC, KYC, idempotency, audit logging, and rate limiting implement the planned security controls.
- Double-entry ledger and serializable transactions implement the transactional correctness goal.

## Known Differences And Limitations

- OTP delivery is mocked through backend logs.
- Card numbers and CVV values are simulated for demo only.
- There are no real banking rails, card network integrations, KYC provider integrations, SMS, email, or production notification services.
- Redis throttling storage is not configured for distributed multi-instance production rate limiting.
- Statements are generated from local data and CSV export; no PDF/storage subsystem is implemented.
- The app is a local demo monolith, not a production deployment.
- Real production banking would need encryption strategy, secrets management, observability, reconciliation jobs, compliance controls, stronger fraud tooling, disaster recovery, and external integrations.
