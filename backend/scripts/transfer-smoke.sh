#!/usr/bin/env bash
# Quick manual checks for POST /payments/transfer.
# Requires: jq, curl, API running (npm run start:dev), Docker DB seeded.
set -euo pipefail

BASE="${BASE_URL:-http://localhost:3000}"
EMAIL="${DEMO_EMAIL:-demo@bank.local}"
PASSWORD="${DEMO_PASSWORD:-Password123!}"
SRC="${SOURCE_ACCOUNT_ID:?Set SOURCE_ACCOUNT_ID from seed output}"
DST="${DEST_ACCOUNT_ID:?Set DEST_ACCOUNT_ID from seed output}"

die() {
  echo "Error: $*" >&2
  exit 1
}

echo "== Login (pre-MFA) =="
PRE_JSON=$(curl -sS -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
echo "$PRE_JSON" | jq .

PRE_MFA_TOKEN=$(echo "$PRE_JSON" | jq -r .accessToken)
if [[ -z "$PRE_MFA_TOKEN" || "$PRE_MFA_TOKEN" == "null" ]]; then
  die "Login did not return accessToken. Check credentials and API logs."
fi

echo
read -r -p "Enter OTP from server logs: " OTP
if [[ -z "${OTP// /}" ]]; then
  die "OTP is empty."
fi

echo "== Verify MFA =="
VERIFY_HTTP=$(curl -sS -o /tmp/verify-mfa.json -w "%{http_code}" -X POST "$BASE/auth/verify-mfa" \
  -H "Authorization: Bearer $PRE_MFA_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "$(jq -n --arg otp "$OTP" '{otp:$otp}')")

cat /tmp/verify-mfa.json | jq .

if [[ "$VERIFY_HTTP" -lt 200 || "$VERIFY_HTTP" -ge 300 ]]; then
  die "Verify MFA failed (HTTP $VERIFY_HTTP). See JSON above."
fi

ACCESS_TOKEN=$(jq -r .accessToken /tmp/verify-mfa.json)
if [[ -z "$ACCESS_TOKEN" || "$ACCESS_TOKEN" == "null" ]]; then
  die "Verify MFA response has no accessToken. Cannot continue transfer tests."
fi

IDEM="idempotency-smoke-$(date +%s)"
BODY=$(jq -n \
  --arg s "$SRC" \
  --arg d "$DST" \
  '{sourceAccountId:$s,destinationAccountId:$d,amount:100,currency:"RON",description:"Test transfer"}')

echo "== Transfer (first, expect 201) =="
TRANSFER1_HTTP=$(curl -sS -D /tmp/transfer1.headers -o /tmp/transfer1.json -w "%{http_code}" -X POST "$BASE/payments/transfer" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -H "x-idempotency-key: $IDEM" \
  -d "$BODY")

echo "--- Response headers (first line) ---"
head -n 1 /tmp/transfer1.headers || true
echo "--- Body ---"
cat /tmp/transfer1.json | jq .
echo "HTTP status: $TRANSFER1_HTTP"

if [[ "$TRANSFER1_HTTP" -lt 200 || "$TRANSFER1_HTTP" -ge 300 ]]; then
  die "First transfer failed (HTTP $TRANSFER1_HTTP). See JSON above."
fi

TXN=$(jq -r .transactionId /tmp/transfer1.json)
if [[ -z "$TXN" || "$TXN" == "null" ]]; then
  die "First transfer did not return a transactionId. See JSON above."
fi

echo "== Transfer (replay same idempotency key, expect 200, same transactionId) =="
curl -sS -D - -o /tmp/transfer2.json -X POST "$BASE/payments/transfer" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -H "x-idempotency-key: $IDEM" \
  -d "$BODY"
echo
cat /tmp/transfer2.json | jq .
TXN2=$(jq -r .transactionId /tmp/transfer2.json)
test "$TXN" = "$TXN2"

echo "== Verify only two ledger lines exist for this transaction (psql) =="
echo "docker compose exec -T postgres psql -U admin -d online_banking -c \"SELECT COUNT(*) FROM ledger_entries WHERE transaction_id = '$TXN';\""

echo "== Step-up (>1000) expect 403 with STEP_UP_REQUIRED =="
curl -sS -D - -o /tmp/stepup.json -X POST "$BASE/payments/transfer" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -H "x-idempotency-key: step-up-$(date +%s)" \
  -d "$(jq -n --arg s "$SRC" --arg d "$DST" '{sourceAccountId:$s,destinationAccountId:$d,amount:1000.01,currency:"RON"}')"
echo
cat /tmp/stepup.json | jq .

echo "== Pre-MFA token on transfer (expect 403) =="
curl -sS -D - -o /tmp/premfa.json -X POST "$BASE/payments/transfer" \
  -H "Authorization: Bearer $PRE_MFA_TOKEN" \
  -H 'Content-Type: application/json' \
  -H "x-idempotency-key: premfa-$(date +%s)" \
  -d "$BODY"
echo
cat /tmp/premfa.json | jq .

echo "== Insufficient funds (expect 400) =="
curl -sS -D - -o /tmp/nofunds.json -X POST "$BASE/payments/transfer" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -H "x-idempotency-key: nofunds-$(date +%s)" \
  -d "$(jq -n --arg s "$SRC" --arg d "$DST" '{sourceAccountId:$s,destinationAccountId:$d,amount:999999999,currency:"RON"}')"
echo
cat /tmp/nofunds.json | jq .

echo "== Missing idempotency key (expect 400) =="
curl -sS -D - -o /tmp/noidem.json -X POST "$BASE/payments/transfer" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "$BODY"
echo
cat /tmp/noidem.json | jq .

echo "Done."
