import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type Account, getAccounts } from '../api/accounts';
import { ApiError } from '../api/client';
import { type TxnSummary, getTransactions } from '../api/transactions';
import { decodeEmail, useAuth } from '../context/AuthContext';

function fmt(bal: string) {
  return parseFloat(bal).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function maskIban(iban: string) {
  return iban.slice(0, 4) + ' •••• •••• ' + iban.slice(-4);
}

export default function DashboardPage() {
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentTxns, setRecentTxns] = useState<TxnSummary[]>([]);
  const [txnsLoading, setTxnsLoading] = useState(true);

  const email = accessToken ? decodeEmail(accessToken) : '';

  useEffect(() => {
    if (!accessToken) return;
    getAccounts(accessToken)
      .then(setAccounts)
      .catch(err => setError(err instanceof ApiError ? err.message : 'Failed to load accounts'))
      .finally(() => setLoading(false));
    getTransactions(accessToken)
      .then(ts => setRecentTxns(ts.slice(0, 5)))
      .catch(() => { /* silent — no accounts yet is fine */ })
      .finally(() => setTxnsLoading(false));
  }, [accessToken]);

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

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
          <button className="btn btn-ghost" onClick={() => navigate('/transfer')}>Transfer</button>
          <button className="btn btn-ghost" onClick={() => navigate('/transactions')}>History</button>
          <button className="btn btn-ghost" onClick={() => navigate('/beneficiaries')}>Beneficiaries</button>
          <button className="btn btn-ghost" onClick={() => navigate('/admin/customers')}>Admin</button>
          <div className="user-chip">
            <span className="dot" />
            {email}
          </div>
          <button id="btn-logout" className="btn btn-ghost" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      <main className="main-content">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="section-title">My Accounts</h1>
            <p className="text-sm text-muted" style={{ marginTop: 4 }}>
              {accounts.length} account{accounts.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-8" style={{ marginTop: 32 }}>
            <span className="spinner" style={{ borderColor: 'rgba(99,102,241,0.3)', borderTopColor: 'var(--accent)' }} />
            <span className="text-muted">Loading accounts…</span>
          </div>
        )}

        {error && <div className="alert alert-error" style={{ marginTop: 20 }}>⚠️ {error}</div>}

        {!loading && !error && accounts.length === 0 && (
          <div className="alert alert-warn" style={{ marginTop: 20 }}>
            No accounts found. Run the seed script to create demo data.
          </div>
        )}

        <div className="accounts-grid">
          {accounts.map(acc => (
            <div key={acc.id} className="account-card">
              <div className={`account-type-badge ${acc.accountType === 'CHECKING' ? 'badge-checking' : 'badge-savings'}`}>
                {acc.accountType === 'CHECKING' ? '💳 Checking' : '🏦 Savings'}
              </div>
              <div>
                <div className="balance">
                  {fmt(acc.availableBalance)}
                  <span className="balance-currency">{acc.currency}</span>
                </div>
                <div className="iban">{maskIban(acc.iban)}</div>
              </div>
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="status-active">● {acc.status}</span>
                <span className="text-sm text-muted" style={{ fontSize: 11 }}>
                  {new Date(acc.openedAt).toLocaleDateString('ro-RO')}
                </span>
              </div>
              <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-3)', fontFamily: 'monospace' }}>
                {acc.id}
              </div>
            </div>
          ))}
        </div>

        {/* Recent transactions */}
        <div style={{ marginTop: 40 }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
            <h2 className="section-title" style={{ fontSize: 16 }}>Recent Transactions</h2>
            <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => navigate('/transactions')}>
              View all →
            </button>
          </div>
          {txnsLoading && (
            <div className="flex items-center gap-8">
              <span className="spinner" style={{ borderColor: 'rgba(99,102,241,0.3)', borderTopColor: 'var(--accent)' }} />
              <span className="text-muted" style={{ fontSize: 13 }}>Loading…</span>
            </div>
          )}
          {!txnsLoading && recentTxns.length === 0 && (
            <p className="text-sm text-muted">No transactions yet. Make your first transfer.</p>
          )}
          {recentTxns.length > 0 && (
            <div className="txn-list">
              {recentTxns.map(t => (
                <div key={t.id} className="recent-txn-row" onClick={() => navigate('/transactions')}>
                  <div>
                    <span className="badge badge-transfer" style={{ marginRight: 8 }}>
                      {t.type.replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'monospace' }}>
                      {t.id.slice(0, 8)}…
                    </span>
                    {t.description && (
                      <span className="text-sm text-muted" style={{ marginLeft: 8, fontSize: 12 }}>
                        {t.description}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-8">
                    <span style={{ fontWeight: 600 }}>{parseFloat(t.amount).toFixed(2)} {t.currency}</span>
                    <span className={`badge badge-${t.status.toLowerCase()}`}>{t.status}</span>
                    <span className="txn-date">{new Date(t.createdAt).toLocaleDateString('ro-RO')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
