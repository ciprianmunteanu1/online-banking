import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type Account, getAccounts } from '../api/accounts';
import { ApiError } from '../api/client';
import { transfer, type TransferResponse } from '../api/payments';
import { useAuth } from '../context/AuthContext';

function newIdemKey() {
  return crypto.randomUUID();
}

type Status = 'idle' | 'loading' | 'success' | 'step_up' | 'error';

export default function TransferPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [srcId, setSrcId] = useState('');
  const [dstId, setDstId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [idemKey, setIdemKey] = useState(newIdemKey);

  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<TransferResponse | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    getAccounts(accessToken).then(accs => {
      setAccounts(accs);
      if (accs.length >= 1) setSrcId(accs[0].id);
      if (accs.length >= 2) setDstId(accs[1].id);
    }).catch(() => {/* dashboard already handled this */});
  }, [accessToken]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setStatus('loading');
    setErrorMsg('');
    setResult(null);

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Enter a valid positive amount.');
      setStatus('error');
      return;
    }

    try {
      const res = await transfer(accessToken, idemKey, {
        sourceAccountId: srcId,
        destinationAccountId: dstId,
        amount: amt,
        currency: 'RON',
        description: description.trim() || undefined,
      });
      setResult(res);
      setStatus('success');
    } catch (err) {
      if (err instanceof ApiError) {
        const raw = err.data as Record<string, unknown> | null;
        if (raw?.code === 'STEP_UP_REQUIRED') {
          setStatus('step_up');
          return;
        }
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Unexpected error. Try again.');
      }
      setStatus('error');
    }
  }

  function resetForm() {
    setStatus('idle');
    setResult(null);
    setErrorMsg('');
    setAmount('');
    setDescription('');
    setIdemKey(newIdemKey());
  }

  const isLoading = status === 'loading';
  const srcAcc = accounts.find(a => a.id === srcId);

  return (
    <div className="shell">
      {/* Top bar */}
      <header className="topbar">
        <div className="logo">
          <div className="logo-icon" style={{ width: 32, height: 32, fontSize: 16 }}>🏦</div>
          <div className="logo-name" style={{ fontSize: 17 }}>Secure<span>Bank</span></div>
        </div>
        <button id="btn-back-dashboard" className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
          ← Dashboard
        </button>
        <button id="btn-go-transactions-from-transfer" className="btn btn-ghost" onClick={() => navigate('/transactions')}>
          Transactions
        </button>
      </header>

      <main className="main-content">
        <div className="transfer-wrap">
          <h1 className="section-title" style={{ marginBottom: 4 }}>New Transfer</h1>
          <p className="text-sm text-muted" style={{ marginBottom: 28 }}>
            Internal transfer between your accounts (MVP)
          </p>

          {/* Success */}
          {status === 'success' && result && (
            <div className="alert alert-success result-box" style={{ flexDirection: 'column', alignItems: 'flex-start', marginBottom: 20 }}>
              <strong>✅ Transfer posted successfully</strong>
              <div className="txid" style={{ marginTop: 8 }}>Transaction ID: {result.transactionId}</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>
                {parseFloat(result.amount).toFixed(2)} {result.currency} — ledger balanced: {result.ledgerBalanced ? '✓' : '✗'}
              </div>
              <button id="btn-new-transfer" className="btn btn-secondary" style={{ marginTop: 14 }} onClick={resetForm}>
                Make another transfer
              </button>
            </div>
          )}

          {/* Step-up */}
          {status === 'step_up' && (
            <div className="alert alert-warn result-box" style={{ flexDirection: 'column', alignItems: 'flex-start', marginBottom: 20 }}>
              <strong>🔒 Step-up authentication required</strong>
              <p style={{ fontSize: 13, marginTop: 6 }}>
                Transfers over 1,000 RON require an additional verification step (not yet implemented in MVP).
              </p>
              <button className="btn btn-secondary" style={{ marginTop: 14 }} onClick={resetForm}>
                Try a smaller amount
              </button>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>⚠️ {errorMsg}</div>
          )}

          {status !== 'success' && status !== 'step_up' && (
            <form className="card" style={{ padding: 28 }} onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label htmlFor="src-account">From account</label>
                <select id="src-account" value={srcId} onChange={e => setSrcId(e.target.value)} required>
                  {accounts.filter(a => a.id !== dstId).map(a => (
                    <option key={a.id} value={a.id}>
                      {a.accountType} — {parseFloat(a.availableBalance).toFixed(2)} {a.currency}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="dst-account">To account</label>
                <select id="dst-account" value={dstId} onChange={e => setDstId(e.target.value)} required>
                  {accounts.filter(a => a.id !== srcId).map(a => (
                    <option key={a.id} value={a.id}>
                      {a.accountType} — {parseFloat(a.availableBalance).toFixed(2)} {a.currency}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="amount">Amount</label>
                <div className="input-row">
                  <input
                    id="amount"
                    type="number"
                    min="0.01"
                    max="1000000000"
                    step="0.01"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    style={{ flex: 1 }}
                  />
                  <div className="input-badge">RON</div>
                </div>
                {srcAcc && amount && parseFloat(amount) > parseFloat(srcAcc.availableBalance) && (
                  <span style={{ fontSize: 12, color: 'var(--error)', marginTop: 4 }}>
                    Exceeds available balance ({parseFloat(srcAcc.availableBalance).toFixed(2)} RON)
                  </span>
                )}
                {amount && parseFloat(amount) > 1000 && (
                  <span style={{ fontSize: 12, color: 'var(--warn)', marginTop: 4 }}>
                    ⚠ Amounts above 1,000 RON will require step-up authentication
                  </span>
                )}
              </div>

              <div className="field">
                <label htmlFor="description">Description (optional)</label>
                <textarea
                  id="description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. Monthly savings"
                  maxLength={255}
                />
              </div>

              <div className="field mb-0">
                <label>Idempotency key</label>
                <div className="input-row">
                  <input
                    id="idem-key"
                    type="text"
                    value={idemKey}
                    readOnly
                    style={{ flex: 1, fontFamily: 'monospace', fontSize: 12 }}
                  />
                  <button
                    type="button"
                    id="btn-regen-idem"
                    className="btn btn-secondary"
                    style={{ whiteSpace: 'nowrap', padding: '0 14px' }}
                    onClick={() => setIdemKey(newIdemKey())}
                  >
                    ↺ New
                  </button>
                </div>
              </div>

              <div className="divider" />

              <button
                id="btn-submit-transfer"
                type="submit"
                className="btn btn-primary"
                disabled={isLoading || !srcId || !dstId || !amount || srcId === dstId}
              >
                {isLoading ? <span className="spinner" /> : null}
                {isLoading ? 'Processing…' : 'Send Transfer'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
