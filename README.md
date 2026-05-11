# Online Banking Platform

This project is a local demo online banking platform. It includes customer banking features, admin tools, double-entry ledger accounting, MFA, step-up confirmation, idempotent payment actions, notifications, sessions/devices management, cards, statements, merchants, and audit logs.

## Tech Stack

- Frontend: React + TypeScript + Vite
- Backend: NestJS + TypeScript
- Database: PostgreSQL + Prisma
- Temporary security state: Redis
- Local infrastructure: Docker Compose

## Main Features

- Register, login, mock MFA, JWT-protected pages.
- Dashboard with customer accounts and balances.
- Own-account transfers and beneficiary transfers.
- Merchant payments to seeded demo merchants.
- Double-entry ledger: each money movement creates one debit and one credit entry.
- Idempotency keys for sensitive payment actions.
- Step-up OTP confirmation for high-value transfers/payments.
- KYC enforcement for transfers, card issuing, and reactivation.
- Cards: issue, block, unblock, close, and reveal simulated details with OTP.
- Statements with balance summary and CSV export.
- Notifications page, toast popups, read/read-all, and cross-tab behavior.
- Sessions/devices page with session revocation.
- Admin customer management, KYC decisions, account crediting, and audit events.
- Basic rate limiting for auth and sensitive endpoints.

## Setup From Scratch

Prerequisites:

- Node.js 20+
- npm
- Docker Desktop or Docker Engine with Compose
- Git

Clone and install:

```bash
git clone https://github.com/ciprianmunteanu1/online-banking.git
cd online-banking

cd backend
npm install

cd ../frontend
npm install
```

Start PostgreSQL and Redis:

```bash
cd backend
docker compose up -d
```

Prepare the database:

```bash
cd backend
npx prisma generate
npx prisma db push
npx prisma db seed
```

Start the backend:

```bash
cd backend
npm run start:dev
```

Start the frontend:

```bash
cd frontend
npm run dev
```

Open the Vite URL, usually `http://localhost:5173`.

## Default Users

- Admin: `admin@bank.local` / `Password123!`
- Demo client: `demo@bank.local` / `Password123!`
- Local test user, if present in your database: `cipri@gmail.com` / `ciprianmunteanu`

MFA is mocked. After login, the OTP is printed in the backend terminal logs.

## Common Commands

Backend typecheck:

```bash
cd backend
npx tsc --noEmit
```

Frontend typecheck:

```bash
cd frontend
npx tsc --noEmit
```

Payment tests:

```bash
cd backend
npm run test:payments
```

Ledger invariant:

```bash
cd backend
docker compose exec -T postgres psql -U admin -d online_banking -c \
  "SELECT transaction_id, COUNT(*) AS n FROM ledger_entries GROUP BY transaction_id HAVING COUNT(*) <> 2;"
```

Expected result: no rows.

## Troubleshooting

- Prisma cannot reach the database: run `cd backend && docker compose up -d`.
- Unauthorized errors: the token may have expired; login and complete MFA again.
- Do not run `docker compose down -v` unless you intentionally want to delete the database volume.
- If testing two users, use separate browsers or browser profiles because browser storage is shared per origin.

## Known Limitations

- OTP codes are mock codes printed in backend logs.
- Card PAN/CVV reveal uses simulated demo data only.
- There are no real banking, card network, payment rail, SMS, email, or KYC provider integrations.
- This is a local-only demo setup, not a production banking system.
