import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { getSessions, revokeSession, type SessionInfo } from '../api/auth';
import { decodeEmail, useAuth } from '../context/AuthContext';

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString('ro-RO') : '-';
}

function statusOf(session: SessionInfo) {
  if (session.revokedAt) return 'Revoked';
  if (session.isActive === false) return 'Expired';
  return 'Active';
}

export default function SecurityPage() {
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const email = accessToken ? decodeEmail(accessToken) : '';
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function loadSessions() {
    if (!accessToken) return;
    setLoading(true);
    try {
      setSessions(await getSessions(accessToken));
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSessions();
  }, [accessToken]);

  async function handleRevoke(id: string) {
    if (!accessToken) return;
    setRevokingId(id);
    try {
      await revokeSession(accessToken, id);
      await loadSessions();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to revoke session');
    } finally {
      setRevokingId(null);
    }
  }

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
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
          <button className="btn btn-ghost" onClick={() => navigate('/merchants/pay')}>Pay Merchant</button>
          <button className="btn btn-ghost" onClick={() => navigate('/transactions')}>History</button>
          <button className="btn btn-ghost" onClick={() => navigate('/statements')}>Statements</button>
          <button className="btn btn-ghost" onClick={() => navigate('/beneficiaries')}>Beneficiaries</button>
          <button className="btn btn-ghost" onClick={() => navigate('/notifications')}>Notifications</button>
          <button className="btn btn-ghost" onClick={() => navigate('/security')} style={{ color: 'var(--accent)', background: 'rgba(99,102,241,0.1)' }}>Security</button>
          <button className="btn btn-ghost" onClick={() => navigate('/admin/customers')}>Admin</button>
          <div className="user-chip"><span className="dot" />{email}</div>
          <button className="btn btn-ghost" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <main className="main-content">
        <h1 className="section-title">Security</h1>
        <p className="page-subtitle" style={{ marginTop: 4 }}>Signed-in sessions and devices</p>

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        {loading ? (
          <div className="flex items-center gap-8" style={{ marginTop: 32 }}>
            <span className="spinner" style={{ borderColor: 'rgba(99,102,241,0.3)', borderTopColor: 'var(--accent)' }} />
            <span className="text-muted">Loading sessions...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="alert alert-warn" style={{ marginTop: 20 }}>No sessions found.</div>
        ) : (
          <div className="txn-list">
            {sessions.map((session) => {
              const active = statusOf(session) === 'Active';
              return (
                <div key={session.id} className="txn-row">
                  <div className="txn-row-header" style={{ gridTemplateColumns: '1.3fr auto auto' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {session.userAgent || 'Unknown device'}
                        {session.isCurrent && <span className="badge badge-transfer" style={{ marginLeft: 8 }}>Current</span>}
                      </div>
                      <div className="txn-accounts">
                        IP {session.ipAddress || '-'} · Created {formatDate(session.createdAt)}
                      </div>
                      <div className="txn-accounts">
                        Expires {formatDate(session.expiresAt)} · Revoked {formatDate(session.revokedAt)}
                      </div>
                    </div>
                    <span className={`badge ${active ? 'badge-posted' : 'badge-reversed'}`}>{statusOf(session)}</span>
                    {active && !session.isCurrent ? (
                      <button
                        className="btn btn-danger"
                        disabled={revokingId === session.id}
                        onClick={() => handleRevoke(session.id)}
                      >
                        {revokingId === session.id ? 'Revoking...' : 'Revoke'}
                      </button>
                    ) : (
                      <span />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
