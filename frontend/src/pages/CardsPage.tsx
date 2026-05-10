import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { decodeEmail, useAuth } from '../context/AuthContext';
import { type Card, getCards, blockCard, unblockCard } from '../api/cards';
import { ApiError } from '../api/client';

export default function CardsPage() {
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const email = accessToken ? decodeEmail(accessToken) : '';

  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    loadCards();
  }, [accessToken]);

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

  return (
    <div className="shell">
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
          <button className="btn btn-ghost" onClick={() => navigate('/beneficiaries')}>Beneficiaries</button>
          <button className="btn btn-ghost" onClick={() => navigate('/admin/customers')}>Admin</button>
          <div className="user-chip"><span className="dot" />{email}</div>
          <button id="btn-logout" className="btn btn-ghost" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <main className="main-content">
        <h1 className="section-title">My Cards</h1>
        
        {errorMsg && (
          <div className="alert alert-error" style={{ marginBottom: 20, marginTop: 16 }}>
            ⚠️ {errorMsg}
          </div>
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

                {c.status === 'ACTIVE' ? (
                  <button
                    className="btn btn-secondary"
                    style={{ width: '100%', borderColor: 'var(--error)', color: 'var(--error)' }}
                    onClick={() => handleBlock(c.id)}
                    disabled={actionLoading === c.id}
                  >
                    {actionLoading === c.id ? 'Processing...' : 'Block Card'}
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={() => handleUnblock(c.id)}
                    disabled={actionLoading === c.id}
                  >
                    {actionLoading === c.id ? 'Processing...' : 'Reactivate Card'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
