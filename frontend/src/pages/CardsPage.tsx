import { useEffect, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { decodeEmail, useAuth } from '../context/AuthContext';
import { type Card, getCards, blockCard, unblockCard, issueCard, closeCard, initiateReveal, verifyReveal } from '../api/cards';
import { type Account, getAccounts } from '../api/accounts';
import { ApiError } from '../api/client';

export default function CardsPage() {
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const email = accessToken ? decodeEmail(accessToken) : '';

  const [cards, setCards] = useState<Card[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Issuing state
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [newCardAccountId, setNewCardAccountId] = useState('');
  const [newCardType, setNewCardType] = useState<'DEBIT' | 'VIRTUAL'>('DEBIT');

  // Reveal state
  const [revealModalCardId, setRevealModalCardId] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [revealError, setRevealError] = useState('');
  const [revealedDetails, setRevealedDetails] = useState<{ cardNumber: string, expiry: string, cvv: string } | null>(null);
  const [revealTimeLeft, setRevealTimeLeft] = useState(0);

  useEffect(() => {
    if (!accessToken) return;
    loadCards();
    getAccounts(accessToken).then(accs => {
      const activeNonSystem = accs.filter(a => a.status === 'ACTIVE');
      setAccounts(activeNonSystem);
      if (activeNonSystem.length > 0) setNewCardAccountId(activeNonSystem[0].id);
    }).catch(() => {});
  }, [accessToken]);

  useEffect(() => {
    let timer: any;
    if (revealTimeLeft > 0) {
      timer = setTimeout(() => setRevealTimeLeft(t => t - 1), 1000);
    } else if (revealTimeLeft === 0 && revealedDetails) {
      handleHideDetails();
    }
    return () => clearTimeout(timer);
  }, [revealTimeLeft, revealedDetails]);

  async function loadCards() {
    setLoading(true);
    try {
      const data = await getCards(accessToken!);
      setCards(data);
      setErrorMsg('');
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Failed to load cards');
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  async function handleBlock(id: string) {
    if (!accessToken) return;
    setActionLoading(id);
    try {
      await blockCard(accessToken, id);
      await loadCards();
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Failed to block card');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleUnblock(id: string) {
    if (!accessToken) return;
    setActionLoading(id);
    try {
      await unblockCard(accessToken, id);
      await loadCards();
    } catch (err) {
      if (err instanceof ApiError && (err.data as any)?.code === 'KYC_REQUIRED') {
        setErrorMsg((err.data as any).message || 'Customer identity verification is required before unblocking cards.');
      } else {
        setErrorMsg(err instanceof ApiError ? err.message : 'Failed to unblock card');
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function handleClose(id: string) {
    if (!accessToken) return;
    if (!confirm('Are you sure you want to permanently close this card?')) return;
    setActionLoading(id);
    try {
      await closeCard(accessToken, id);
      await loadCards();
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Failed to close card');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleIssueCard(e: FormEvent) {
    e.preventDefault();
    if (!accessToken || !newCardAccountId) return;
    setActionLoading('issue');
    setErrorMsg('');
    try {
      await issueCard(accessToken, { accountId: newCardAccountId, cardType: newCardType });
      setShowIssueForm(false);
      await loadCards();
    } catch (err) {
      if (err instanceof ApiError && (err.data as any)?.code === 'KYC_REQUIRED') {
        setErrorMsg((err.data as any).message || 'Customer identity verification is required before issuing cards.');
      } else {
        setErrorMsg(err instanceof ApiError ? err.message : 'Failed to issue card');
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function handleInitiateReveal(id: string) {
    if (!accessToken) return;
    setActionLoading(id);
    try {
      await initiateReveal(accessToken, id);
      setRevealModalCardId(id);
      setOtp('');
      setRevealError('');
      setRevealedDetails(null);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Failed to initiate reveal');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleVerifyReveal(e: FormEvent) {
    e.preventDefault();
    if (!accessToken || !revealModalCardId) return;
    setActionLoading('verify');
    setRevealError('');
    try {
      const res = await verifyReveal(accessToken, revealModalCardId, { otp });
      setRevealedDetails({ cardNumber: res.cardNumber, expiry: res.expiry, cvv: res.cvv });
      setRevealTimeLeft(res.revealExpiresInSeconds || 60);
    } catch (err) {
      setRevealError(err instanceof ApiError ? err.message : 'Failed to verify OTP');
    } finally {
      setActionLoading(null);
    }
  }

  function handleHideDetails() {
    setRevealedDetails(null);
    setRevealModalCardId(null);
    setOtp('');
    setRevealTimeLeft(0);
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
          <button className="btn btn-ghost" onClick={() => navigate('/cards')} style={{ color: 'var(--accent)', background: 'rgba(99,102,241,0.1)' }}>Cards</button>
          <button className="btn btn-ghost" onClick={() => navigate('/transfer')}>Transfer</button>
          <button className="btn btn-ghost" onClick={() => navigate('/transactions')}>History</button>
          <button className="btn btn-ghost" onClick={() => navigate('/beneficiaries')}>Beneficiaries</button>
          <button className="btn btn-ghost" onClick={() => navigate('/admin/customers')}>Admin</button>
          <div className="user-chip"><span className="dot" />{email}</div>
          <button id="btn-logout" className="btn btn-ghost" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="section-title">My Cards</h1>
          {!showIssueForm && (
            <button className="btn btn-primary" onClick={() => setShowIssueForm(true)}>
              Issue New Card
            </button>
          )}
        </div>
        
        {errorMsg && (
          <div className="alert alert-error" style={{ marginBottom: 20, marginTop: 16 }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {showIssueForm && (
          <form className="card" style={{ padding: 24, marginTop: 24, marginBottom: 24 }} onSubmit={handleIssueCard}>
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>Issue New Card</h3>
            <div className="field">
              <label>Link to Account</label>
              <select value={newCardAccountId} onChange={(e) => setNewCardAccountId(e.target.value)} required>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.accountType} - {a.iban} ({parseFloat(a.availableBalance).toFixed(2)} {a.currency})</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Card Type</label>
              <select value={newCardType} onChange={(e) => setNewCardType(e.target.value as any)}>
                <option value="DEBIT">Debit Card</option>
                <option value="VIRTUAL">Virtual Card</option>
              </select>
            </div>
            <div className="flex gap-8" style={{ marginTop: 16 }}>
              <button type="submit" className="btn btn-primary" disabled={actionLoading === 'issue' || !newCardAccountId}>
                {actionLoading === 'issue' ? 'Issuing...' : 'Issue Card'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowIssueForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex items-center gap-8" style={{ marginTop: 32 }}>
            <span className="spinner" style={{ borderColor: 'rgba(99,102,241,0.3)', borderTopColor: 'var(--accent)' }} />
            <span className="text-muted">Loading cards…</span>
          </div>
        ) : cards.length === 0 ? (
          <div className="card" style={{ padding: 32, textAlign: 'center', marginTop: 20 }}>
            <p className="text-muted">You have no active cards.</p>
          </div>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24, marginTop: 24 }}>
            {cards.map(c => (
              <div key={c.id} className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{c.cardType} CARD</div>
                    <div className="text-muted text-sm" style={{ marginTop: 4 }}>{c.maskedPan}</div>
                  </div>
                  <div className={`status-badge ${c.status === 'ACTIVE' ? 'success' : 'pending'}`}>
                    {c.status}
                  </div>
                </div>

                <div className="text-sm text-muted" style={{ marginBottom: 24, flex: 1 }}>
                  Linked to: {c.account.accountType}
                  <div style={{ fontFamily: 'monospace', marginTop: 2 }}>{c.account.iban}</div>
                </div>

                <div className="flex gap-8" style={{ marginTop: 'auto', flexDirection: 'column' }}>
                  {c.status === 'ACTIVE' ? (
                    <>
                      <button
                        className="btn btn-secondary"
                        style={{ width: '100%' }}
                        onClick={() => handleInitiateReveal(c.id)}
                        disabled={actionLoading === c.id}
                      >
                        View details
                      </button>
                      <div className="flex gap-8">
                        <button
                          className="btn btn-secondary"
                          style={{ flex: 1, borderColor: 'var(--error)', color: 'var(--error)' }}
                          onClick={() => handleBlock(c.id)}
                          disabled={actionLoading === c.id}
                        >
                          {actionLoading === c.id ? 'Processing...' : 'Block'}
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ flex: 1, borderColor: 'var(--error)', color: 'var(--error)' }}
                          onClick={() => handleClose(c.id)}
                          disabled={actionLoading === c.id}
                        >
                          Close
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <button
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        onClick={() => handleUnblock(c.id)}
                        disabled={actionLoading === c.id}
                      >
                        {actionLoading === c.id ? 'Processing...' : 'Reactivate Card'}
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ width: '100%', borderColor: 'var(--error)', color: 'var(--error)' }}
                        onClick={() => handleClose(c.id)}
                        disabled={actionLoading === c.id}
                      >
                        Close Card
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {revealModalCardId && !revealedDetails && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div className="card" style={{ padding: 32, width: 400, maxWidth: '90%' }}>
            <h3 style={{ marginBottom: 16 }}>Reveal Card Details</h3>
            <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
              We have generated an OTP for you. Check the backend logs to find it.
            </p>
            {revealError && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {revealError}</div>}
            <form onSubmit={handleVerifyReveal}>
              <div className="field">
                <label>Enter 6-digit OTP</label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
              <div className="flex gap-8" style={{ marginTop: 24 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={otp.length !== 6 || actionLoading === 'verify'}>
                  {actionLoading === 'verify' ? 'Verifying...' : 'Reveal'}
                </button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={handleHideDetails}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {revealedDetails && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div className="card" style={{ padding: 32, width: 400, maxWidth: '90%', textAlign: 'center' }}>
            <h3 style={{ marginBottom: 16 }}>Card Details</h3>
            <div style={{ padding: 16, background: 'var(--surface-raised)', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 18, letterSpacing: 2, marginBottom: 12, fontFamily: 'monospace' }}>
                {revealedDetails.cardNumber}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <div>Expiry: {revealedDetails.expiry}</div>
                <div>CVV: {revealedDetails.cvv}</div>
              </div>
            </div>
            <div className="text-sm text-muted" style={{ marginBottom: 24 }}>
              Hiding in {revealTimeLeft}s
            </div>
            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleHideDetails}>
              Hide Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
