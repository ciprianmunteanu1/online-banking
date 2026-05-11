import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { AuditEvent, getAuditEvents } from '../api/admin';
import { decodeEmail, useAuth } from '../context/AuthContext';

const LIMIT = 25;

function compactJson(value: unknown) {
  if (!value || typeof value !== 'object') return '';
  const text = JSON.stringify(value);
  return text.length > 120 ? `${text.slice(0, 120)}...` : text;
}

export default function AdminAuditPage() {
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const email = accessToken ? decodeEmail(accessToken) : '';

  const [items, setItems] = useState<AuditEvent[]>([]);
  const [action, setAction] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  async function load(nextPage = page) {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await getAuditEvents(accessToken, {
        action,
        resourceType,
        from,
        to,
        page: nextPage,
        limit: LIMIT,
      });
      setItems(res.items);
      setPage(res.page);
      setTotal(res.total);
      setErr('');
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setErr('Admin access required.');
      } else {
        setErr(e instanceof ApiError ? e.message : 'Failed to load audit events');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
  }, [accessToken]);

  function applyFilters(e: FormEvent) {
    e.preventDefault();
    load(1);
  }

  const maxPage = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="shell">
      <header className="topbar">
        <div className="logo">
          <div className="logo-icon" style={{ width: 32, height: 32, fontSize: 16 }}>🏦</div>
          <div className="logo-name" style={{ fontSize: 17 }}>Secure<span>Bank</span></div>
        </div>
        <div className="topbar-right">
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button className="btn btn-ghost" onClick={() => navigate('/admin/customers')}>Customers</button>
          <button className="btn btn-ghost" onClick={() => navigate('/admin/audit')} style={{ color: 'var(--accent)', background: 'rgba(99,102,241,0.1)' }}>Audit</button>
          <div className="user-chip"><span className="dot" />{email}</div>
          <button className="btn btn-ghost" onClick={() => { logout(); navigate('/'); }}>Sign out</button>
        </div>
      </header>

      <main className="main-content">
        <div style={{ marginBottom: 24 }}>
          <h1 className="section-title">Audit Events</h1>
          <p className="text-sm text-muted" style={{ marginTop: 4 }}>Admin-only system activity log</p>
        </div>

        <form className="card" style={{ padding: 20, marginBottom: 20 }} onSubmit={applyFilters}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <div className="field mb-0">
              <label>Action</label>
              <input value={action} onChange={e => setAction(e.target.value)} placeholder="SESSION_REVOKED" />
            </div>
            <div className="field mb-0">
              <label>Resource Type</label>
              <input value={resourceType} onChange={e => setResourceType(e.target.value)} placeholder="Session" />
            </div>
            <div className="field mb-0">
              <label>From</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div className="field mb-0">
              <label>To</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary" style={{ width: 'auto', marginTop: 16, padding: '9px 16px' }} type="submit">
            Apply Filters
          </button>
        </form>

        {loading && <div className="spinner" style={{ margin: '0 auto', borderColor: 'rgba(99,102,241,0.3)', borderTopColor: 'var(--accent)' }} />}
        {err && <div className="alert alert-error">⚠️ {err}</div>}
        {!loading && !err && items.length === 0 && <div className="alert alert-warn">No audit events found.</div>}

        {!loading && !err && items.length > 0 && (
          <>
            <div className="txn-list">
              {items.map(event => (
                <div className="txn-row" key={event.id}>
                  <div className="txn-row-header" style={{ gridTemplateColumns: '1fr auto', alignItems: 'start' }}>
                    <div>
                      <div>
                        <span className="badge badge-transfer" style={{ marginRight: 8 }}>{event.action}</span>
                        <span className="text-sm">{event.resourceType}</span>
                      </div>
                      <div className="txn-accounts">Resource: {event.resourceId || '-'}</div>
                      <div className="txn-accounts">Actor: {event.actorUserId || 'system'} · IP: {event.ipAddress || '-'}</div>
                      <div className="txn-accounts">Agent: {event.userAgent || '-'}</div>
                      {compactJson(event.metadata) && <div className="txn-accounts">Metadata: {compactJson(event.metadata)}</div>}
                    </div>
                    <span className="txn-date">{new Date(event.createdAt).toLocaleString('ro-RO')}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center" style={{ marginTop: 16 }}>
              <button className="btn btn-secondary" disabled={page <= 1} onClick={() => load(page - 1)}>Previous</button>
              <span className="text-sm text-muted">Page {page} of {maxPage} · Total {total} · Limit {LIMIT}</span>
              <button className="btn btn-secondary" disabled={page >= maxPage} onClick={() => load(page + 1)}>Next</button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
