import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { type TxnSummary, type TxnDetail, getTransactions, getTransaction } from '../api/transactions';
import { ApiError } from '../api/client';
import { decodeEmail, useAuth } from '../context/AuthContext';

function short(id: string | null) {
  if (!id) return '—';
  return id.slice(0, 8) + '…';
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString('ro-RO', { dateStyle: 'short', timeStyle: 'short' });
}

function statusCls(s: string) {
  const m: Record<string, string> = {
    POSTED: 'badge-posted', PENDING: 'badge-pending',
    FAILED: 'badge-failed', REVERSED: 'badge-reversed',
  };
  return m[s] ?? 'badge-pending';
}

function TxnRow({ txn, token }: { txn: TxnSummary; token: string }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<TxnDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function toggle() {
    setOpen(o => !o);
    if (!open && !detail) {
      setLoading(true);
      try {
        setDetail(await getTransaction(token, txn.id));
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : 'Failed to load detail');
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className={`txn-row${open ? ' txn-row-open' : ''}`}>
      <div className="txn-row-header" onClick={toggle} role="button" tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && toggle()}>
        <div>
          <span className="badge badge-transfer" style={{ marginRight: 8 }}>
            {txn.type.replace(/_/g, ' ')}
          </span>
          <span className="txn-accounts">
            {short(txn.fromAccountId)} → {short(txn.toAccountId)}
          </span>
          {txn.description && (
            <div className="text-sm text-muted" style={{ marginTop: 2, fontSize: 12 }}>
              {txn.description}
            </div>
          )}
        </div>
        <span className={`badge ${statusCls(txn.status)}`}>{txn.status}</span>
        <span className="txn-amount">
          {parseFloat(txn.amount).toFixed(2)}
          <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 4, color: 'var(--text-2)' }}>
            {txn.currency}
          </span>
        </span>
        <div style={{ textAlign: 'right' }}>
          <div className="txn-date">{fmtDate(txn.createdAt)}</div>
          <span className="txn-chevron">▼</span>
        </div>
      </div>

      {open && (
        <div className="txn-detail-panel">
          <div className="txn-full-id">ID: {txn.id}</div>
          {loading && (
            <div className="flex items-center gap-8">
              <span className="spinner" style={{ width: 14, height: 14 }} />
              <span className="text-sm text-muted">Loading ledger…</span>
            </div>
          )}
          {err && <div className="alert alert-error">{err}</div>}
          {detail && (
            <div className="ledger-entries">
              <p className="text-sm text-muted" style={{ marginBottom: 6 }}>
                Ledger entries ({detail.ledgerEntries.length})
              </p>
              {detail.ledgerEntries.map(le => (
                <div key={le.id} className="ledger-row">
                  <div>
                    <span className={`badge badge-${le.side.toLowerCase()}`} style={{ marginRight: 8 }}>
                      {le.side}
                    </span>
                    <span className="ledger-meta">{short(le.accountId)}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 600 }}>
                      {parseFloat(le.amount).toFixed(2)} {le.currency}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TransactionsPage() {
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const [txns, setTxns] = useState<TxnSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const email = accessToken ? decodeEmail(accessToken) : '';

  useEffect(() => {
    if (!accessToken) return;
    getTransactions(accessToken)
      .then(setTxns)
      .catch(e => setError(e instanceof ApiError ? e.message : 'Failed to load transactions'))
      .finally(() => setLoading(false));
  }, [accessToken]);

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
          <button className="btn btn-ghost" onClick={() => navigate('/transactions')} style={{ color: 'var(--accent)', background: 'rgba(99,102,241,0.1)' }}>History</button>
          <button className="btn btn-ghost" onClick={() => navigate('/statements')}>Statements</button>
          <button className="btn btn-ghost" onClick={() => navigate('/beneficiaries')}>Beneficiaries</button>
          <button className="btn btn-ghost" onClick={() => navigate('/notifications')}>Notifications</button>
          <button className="btn btn-ghost" onClick={() => navigate('/admin/customers')}>Admin</button>
          <div className="user-chip"><span className="dot" />{email}</div>
          <button id="btn-logout-txns" className="btn btn-ghost" onClick={() => { logout(); navigate('/'); }}>
            Sign out
          </button>
        </div>
      </header>

      <main className="main-content">
        <h1 className="section-title" style={{ marginBottom: 4 }}>Transaction History</h1>
        <p className="text-sm text-muted" style={{ marginBottom: 20 }}>
          {txns.length} transaction{txns.length !== 1 ? 's' : ''} — click a row to see ledger entries
        </p>

        {loading && (
          <div className="flex items-center gap-8">
            <span className="spinner" style={{ borderColor: 'rgba(99,102,241,0.3)', borderTopColor: 'var(--accent)' }} />
            <span className="text-muted">Loading transactions…</span>
          </div>
        )}

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        {!loading && !error && txns.length === 0 && (
          <div className="alert alert-warn">
            No transactions yet. Make a transfer from the dashboard.
          </div>
        )}

        {txns.length > 0 && accessToken && (
          <div className="txn-list">
            {txns.map(t => (
              <TxnRow key={t.id} txn={t} token={accessToken} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
