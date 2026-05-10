import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type Account, getAccounts } from '../api/accounts';
import { ApiError } from '../api/client';
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

  const email = accessToken ? decodeEmail(accessToken) : '';

  useEffect(() => {
    if (!accessToken) return;
    getAccounts(accessToken)
      .then(setAccounts)
      .catch(err => setError(err instanceof ApiError ? err.message : 'Failed to load accounts'))
      .finally(() => setLoading(false));
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
          <button
            id="btn-go-transfer"
            className="btn btn-primary"
            style={{ width: 'auto', padding: '10px 20px' }}
            onClick={() => navigate('/transfer')}
            disabled={accounts.length < 2}
          >
            ↗ New Transfer
          </button>
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
      </main>
    </div>
  );
}
