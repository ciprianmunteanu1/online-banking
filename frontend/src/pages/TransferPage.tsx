import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type Account, getAccounts } from '../api/accounts';
import { ApiError } from '../api/client';
import { transfer, transferToBeneficiary, confirmStepUp, type TransferResponse } from '../api/payments';
import type { TransferToBeneficiaryResponse } from '../api/payments';
import { type Beneficiary, getBeneficiaries } from '../api/beneficiaries';
import { UserMe, getMe } from '../api/auth';
import { decodeEmail, useAuth } from '../context/AuthContext';

function newIdemKey() {
  return crypto.randomUUID();
}

type Status = 'idle' | 'loading' | 'success' | 'step_up' | 'error';

export default function TransferPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const email = accessToken ? decodeEmail(accessToken) : '';

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [srcId, setSrcId] = useState('');
  const [dstId, setDstId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [idemKey, setIdemKey] = useState(newIdemKey);

  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<TransferResponse | TransferToBeneficiaryResponse | null>(null);
  const [me, setMe] = useState<UserMe | null>(null);

  const [stepUpChallengeId, setStepUpChallengeId] = useState('');
  const [stepUpOtp, setStepUpOtp] = useState('');
  const [stepUpError, setStepUpError] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  const [transferMode, setTransferMode] = useState<'own' | 'beneficiary'>('own');
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [beneId, setBeneId] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    getMe(accessToken).then(setMe).catch(() => {});
    getAccounts(accessToken).then(accs => {
      setAccounts(accs);
      if (accs.length >= 1) setSrcId(accs[0].id);
      if (accs.length >= 2) setDstId(accs[1].id);
    }).catch(() => {/* dashboard already handled this */});
    getBeneficiaries(accessToken).then(bens => {
      setBeneficiaries(bens);
      if (bens.length > 0) setBeneId(bens[0].id);
    }).catch(() => {});
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
      let res;
      if (transferMode === 'own') {
        res = await transfer(accessToken, idemKey, {
          sourceAccountId: srcId,
          destinationAccountId: dstId,
          amount: amt,
          currency: 'RON',
          description: description.trim() || undefined,
        });
      } else {
        res = await transferToBeneficiary(accessToken, idemKey, {
          sourceAccountId: srcId,
          beneficiaryId: beneId,
          amount: amt,
          currency: 'RON',
          description: description.trim() || undefined,
        });
      }
      setResult(res);
      setStatus('success');
    } catch (err) {
      if (err instanceof ApiError) {
        const raw = err.data as Record<string, unknown> | null;
        if (raw?.code === 'STEP_UP_REQUIRED') {
          setStepUpChallengeId(raw.challengeId as string);
          setStepUpOtp('');
          setStepUpError('');
          setStatus('step_up');
          return;
        }
        if (raw?.code === 'KYC_REQUIRED') {
          setErrorMsg(raw.message as string || 'Customer identity verification is required before transfers.');
          setStatus('error');
          return;
        }
        setErrorMsg(err.message);
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
      setResult(res as any);
      setStatus('success');
    } catch (err) {
      if (err instanceof ApiError) {
        setStepUpError(err.message);
      } else {
        setStepUpError('Failed to confirm step-up.');
      }
    } finally {
      setIsConfirming(false);
    }
  }

  function resetForm() {
    setStatus('idle');
    setResult(null);
    setErrorMsg('');
    setAmount('');
    setDescription('');
    setIdemKey(newIdemKey());
    setStepUpChallengeId('');
    setStepUpOtp('');
    setStepUpError('');
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
        <div className="topbar-right">
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button className="btn btn-ghost" onClick={() => navigate('/cards')}>Cards</button>
          <button className="btn btn-ghost" onClick={() => navigate('/transfer')}>Transfer</button>
          <button className="btn btn-ghost" onClick={() => navigate('/transactions')}>History</button>
          <button className="btn btn-ghost" onClick={() => navigate('/statements')}>Statements</button>
          <button className="btn btn-ghost" onClick={() => navigate('/beneficiaries')}>Beneficiaries</button>
          <button className="btn btn-ghost" onClick={() => navigate('/admin/customers')}>Admin</button>
        </div>
        <div className="user-chip"><span className="dot" />{email}</div>
      </header>

      <main className="main-content">
        <div className="transfer-wrap">
          <h1 className="section-title" style={{ marginBottom: 4 }}>New Transfer</h1>
          <div className="flex gap-8" style={{ marginBottom: 28, marginTop: 12 }}>
            <button
              className={`btn ${transferMode === 'own' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setTransferMode('own'); resetForm(); }}
              style={{ padding: '6px 16px', fontSize: 13 }}
            >
              Between my accounts
            </button>
            <button
              className={`btn ${transferMode === 'beneficiary' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setTransferMode('beneficiary'); resetForm(); }}
              style={{ padding: '6px 16px', fontSize: 13 }}
            >
              To beneficiary
            </button>
          </div>

          {/* Success */}
          {status === 'success' && result && (
            <div className="alert alert-success result-box" style={{ flexDirection: 'column', alignItems: 'flex-start', marginBottom: 20 }}>
              <strong>✅ Transfer posted successfully</strong>
              <div className="txid" style={{ marginTop: 8 }}>Transaction ID: {result.transactionId}</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>
                {parseFloat(result.amount).toFixed(2)} {result.currency} — ledger balanced: {result.ledgerBalanced ? '✓' : '✗'}
              </div>
              {'internalBeneficiary' in result && (
                <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text-3)' }}>
                  Beneficiary type: {result.internalBeneficiary ? 'Internal matching account' : 'External destination'}
                </div>
              )}
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
                  {accounts.filter(a => transferMode === 'beneficiary' || a.id !== dstId).map(a => (
                    <option key={a.id} value={a.id}>
                      {a.accountType} — {parseFloat(a.availableBalance).toFixed(2)} {a.currency}
                    </option>
                  ))}
                </select>
              </div>

              {transferMode === 'own' ? (
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
              ) : (
                <div className="field">
                  <label htmlFor="bene-account">To beneficiary</label>
                  {beneficiaries.length === 0 ? (
                    <div className="text-sm text-muted">No beneficiaries found. Add one in Beneficiaries tab.</div>
                  ) : (
                    <select id="bene-account" value={beneId} onChange={e => setBeneId(e.target.value)} required>
                      {beneficiaries.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.displayName} ({b.iban})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

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
                disabled={
                  isLoading ||
                  !srcId ||
                  !amount ||
                  (me ? me.kycStatus !== 'VERIFIED' : false) ||
                  (transferMode === 'own' ? !dstId || srcId === dstId : !beneId)
                }
              >
                {isLoading ? <span className="spinner" /> : null}
                {isLoading ? 'Processing…' : 'Send Transfer'}
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
              This transfer requires step-up authentication. An OTP has been generated (check backend logs).
            </p>
            {stepUpError && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {stepUpError}</div>}
            <form onSubmit={handleConfirmStepUp}>
              <div className="field">
                <label>Enter 6-digit OTP</label>
                <input
                  type="text"
                  maxLength={6}
                  value={stepUpOtp}
                  onChange={(e) => setStepUpOtp(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
              <div className="flex gap-8" style={{ marginTop: 24 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={stepUpOtp.length !== 6 || isConfirming}>
                  {isConfirming ? 'Verifying...' : 'Confirm'}
                </button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setStatus('idle'); setStepUpError(''); }} disabled={isConfirming}>
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
