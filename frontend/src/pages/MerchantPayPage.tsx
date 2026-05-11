import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type Account, getAccounts } from '../api/accounts';
import { ApiError } from '../api/client';
import { confirmStepUp } from '../api/payments';
import { getMerchants, payMerchant, type Merchant, type MerchantPaymentResponse } from '../api/merchants';
import { decodeEmail, useAuth } from '../context/AuthContext';

type Status = 'idle' | 'loading' | 'success' | 'step_up' | 'error';

function errorMessage(err: ApiError) {
  const raw = err.data as Record<string, unknown> | null;
  if (raw?.code === 'KYC_REQUIRED') return String(raw.message || 'Customer identity verification is required before merchant payments.');
  if (raw?.code === 'STEP_UP_REQUIRED') return 'Step-up authentication required.';
  return err.message;
}

export default function MerchantPayPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const email = accessToken ? decodeEmail(accessToken) : '';

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<MerchantPaymentResponse | null>(null);
  const [stepUpChallengeId, setStepUpChallengeId] = useState('');
  const [stepUpOtp, setStepUpOtp] = useState('');
  const [stepUpError, setStepUpError] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    getAccounts(accessToken).then(accs => {
      setAccounts(accs);
      if (accs.length > 0) setSourceAccountId(accs[0].id);
    }).catch(() => {});
    getMerchants(accessToken).then(ms => {
      setMerchants(ms);
      if (ms.length > 0) setMerchantId(ms[0].id);
    }).catch(err => setErrorMsg(err instanceof ApiError ? err.message : 'Failed to load merchants'));
  }, [accessToken]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    const amt = parseFloat(amount);
    if (Number.isNaN(amt) || amt <= 0) {
      setErrorMsg('Enter a valid positive amount.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMsg('');
    setResult(null);
    try {
      const res = await payMerchant(accessToken, crypto.randomUUID(), {
        sourceAccountId,
        merchantId,
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
          setStepUpChallengeId(String(raw.challengeId || ''));
          setStepUpOtp('');
          setStepUpError('');
          setStatus('step_up');
          return;
        }
        setErrorMsg(errorMessage(err));
      } else {
        setErrorMsg('Unexpected error. Try again.');
      }
      setStatus('error');
    }
  }

  async function handleConfirmStepUp(e: FormEvent) {
    e.preventDefault();
    if (!accessToken || !stepUpChallengeId) return;
    setIsConfirming(true);
    setStepUpError('');
    try {
      const res = await confirmStepUp(accessToken, { challengeId: stepUpChallengeId, otp: stepUpOtp });
      setResult(res as MerchantPaymentResponse);
      setStatus('success');
    } catch (err) {
      setStepUpError(err instanceof ApiError ? err.message : 'Failed to confirm step-up.');
    } finally {
      setIsConfirming(false);
    }
  }

  function resetForm() {
    setStatus('idle');
    setErrorMsg('');
    setResult(null);
    setAmount('');
    setDescription('');
    setStepUpChallengeId('');
    setStepUpOtp('');
    setStepUpError('');
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="logo">
          <div className="logo-icon" style={{ width: 32, height: 32, fontSize: 16 }}>🏦</div>
          <div className="logo-name" style={{ fontSize: 17 }}>Secure<span>Bank</span></div>
        </div>
        <div className="topbar-right">
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button className="btn btn-ghost" onClick={() => navigate('/transfer')}>Transfer</button>
          <button className="btn btn-ghost" onClick={() => navigate('/merchants/pay')} style={{ color: 'var(--accent)', background: 'rgba(99,102,241,0.1)' }}>Pay Merchant</button>
          <button className="btn btn-ghost" onClick={() => navigate('/transactions')}>History</button>
          <button className="btn btn-ghost" onClick={() => navigate('/notifications')}>Notifications</button>
          <button className="btn btn-ghost" onClick={() => navigate('/security')}>Security</button>
          <div className="user-chip"><span className="dot" />{email}</div>
        </div>
      </header>

      <main className="main-content">
        <div className="transfer-wrap">
          <h1 className="section-title" style={{ marginBottom: 4 }}>Pay Merchant</h1>
          <p className="text-sm text-muted" style={{ marginBottom: 24 }}>Pay active demo merchants from your account</p>

          {status === 'success' && result && (
            <div className="alert alert-success result-box" style={{ flexDirection: 'column', alignItems: 'flex-start', marginBottom: 20 }}>
              <strong>✅ Payment posted successfully</strong>
              <div className="txid" style={{ marginTop: 8 }}>Transaction ID: {result.transactionId}</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>
                {parseFloat(result.amount).toFixed(2)} {result.currency} — ledger balanced: {result.ledgerBalanced ? '✓' : '✗'}
              </div>
              <button className="btn btn-secondary" style={{ marginTop: 14 }} onClick={resetForm}>Make another payment</button>
            </div>
          )}

          {status === 'error' && <div className="alert alert-error" style={{ marginBottom: 20 }}>⚠️ {errorMsg}</div>}

          {status !== 'success' && (
            <form className="card" style={{ padding: 28 }} onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label>From account</label>
                <select value={sourceAccountId} onChange={e => setSourceAccountId(e.target.value)} required>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.accountType} — {parseFloat(a.availableBalance).toFixed(2)} {a.currency}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Merchant</label>
                <select value={merchantId} onChange={e => setMerchantId(e.target.value)} required>
                  {merchants.map(m => (
                    <option key={m.id} value={m.id}>{m.name} — {m.category}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Amount</label>
                <div className="input-row">
                  <input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
                  <div className="input-badge">RON</div>
                </div>
              </div>
              <div className="field">
                <label>Description / reference</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Groceries" maxLength={255} />
              </div>
              <button className="btn btn-primary" disabled={status === 'loading' || !sourceAccountId || !merchantId || !amount}>
                {status === 'loading' ? <span className="spinner" /> : null}
                {status === 'loading' ? 'Processing...' : 'Pay'}
              </button>
            </form>
          )}
        </div>
      </main>

      {status === 'step_up' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div className="card" style={{ padding: 32, width: 400, maxWidth: '90%' }}>
            <h3 style={{ marginBottom: 16 }}>Additional Verification Required</h3>
            <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
              This merchant payment requires step-up authentication. Check backend logs for the OTP.
            </p>
            {stepUpError && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {stepUpError}</div>}
            <form onSubmit={handleConfirmStepUp}>
              <div className="field">
                <label>Enter 6-digit OTP</label>
                <input type="text" maxLength={6} value={stepUpOtp} onChange={e => setStepUpOtp(e.target.value.replace(/\D/g, ''))} required />
              </div>
              <div className="flex gap-8" style={{ marginTop: 24 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={stepUpOtp.length !== 6 || isConfirming}>
                  {isConfirming ? 'Verifying...' : 'Confirm'}
                </button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStatus('idle')} disabled={isConfirming}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
