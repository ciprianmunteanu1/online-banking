import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, decodeEmail } from '../context/AuthContext';
import { ApiError } from '../api/client';
import { AdminCustomer, getAdminCustomers, verifyCustomer, rejectCustomer, creditAccount } from '../api/admin';

function CustomerRow({ c, token, onChange }: { c: AdminCustomer; token: string; onChange: () => void }) {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [fundLoading, setFundLoading] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);
  const [err, setErr] = useState('');

  async function handleVerify() {
    setLoading(true); setErr('');
    try {
      await verifyCustomer(token, c.id);
      onChange();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    setLoading(true); setErr('');
    try {
      await rejectCustomer(token, c.id);
      onChange();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Rejection failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleFund(e: FormEvent, accountId: string) {
    e.preventDefault();
    setFundLoading(accountId);
    setErr(''); setTxId(null);
    try {
      const res = await creditAccount(token, accountId, {
        amount: parseFloat(amount),
        currency: 'RON',
        description: desc || undefined
      });
      setTxId(res.transactionId);
      setAmount(''); setDesc('');
      onChange();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Funding failed');
    } finally {
      setFundLoading(null);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 16, padding: 24 }}>
      <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 18, marginBottom: 4 }}>{c.fullLegalName} <span className="text-muted" style={{ fontSize: 14 }}>({c.user.email})</span></h3>
          <p className="text-sm">Status: <strong style={{ color: c.kycStatus === 'VERIFIED' ? 'var(--success)' : c.kycStatus === 'REJECTED' ? 'var(--error)' : 'var(--warn)' }}>{c.kycStatus}</strong></p>
          <p className="text-sm text-muted">Joined: {new Date(c.createdAt).toLocaleDateString('ro-RO')}</p>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-primary" onClick={handleVerify} disabled={loading || c.kycStatus === 'VERIFIED'} style={{ padding: '8px 16px', fontSize: 12 }}>
            Verify
          </button>
          <button className="btn btn-danger" onClick={handleReject} disabled={loading || c.kycStatus === 'REJECTED'} style={{ padding: '8px 16px', fontSize: 12 }}>
            Reject
          </button>
        </div>
      </div>
      
      {err && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {err}</div>}
      {txId && <div className="alert alert-success" style={{ marginBottom: 16 }}>✅ Funded successfully. TXID: {txId}</div>}
      
      <div className="accounts-list" style={{ background: 'var(--bg-input)', borderRadius: 'var(--r)', padding: 16 }}>
        <h4 style={{ fontSize: 14, marginBottom: 12 }}>Accounts</h4>
        {c.accounts.length === 0 ? <p className="text-sm text-muted">No accounts.</p> : c.accounts.map(a => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <p style={{ fontWeight: 600 }}>{a.accountType} &middot; <span style={{ color: 'var(--success)' }}>{a.availableBalance} {a.currency}</span></p>
              <p className="text-sm text-muted" style={{ fontFamily: 'monospace' }}>{a.iban}</p>
            </div>
            <form onSubmit={e => handleFund(e, a.id)} className="flex gap-8 items-center">
              <input type="number" step="0.01" min="0.01" placeholder="Amount (RON)" value={amount} onChange={e => setAmount(e.target.value)} required style={{ padding: '6px 10px', fontSize: 12, width: 120, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: '#fff' }} />
              <input type="text" placeholder="Note (opt)" value={desc} onChange={e => setDesc(e.target.value)} style={{ padding: '6px 10px', fontSize: 12, width: 120, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: '#fff' }} />
              <button type="submit" className="btn btn-secondary" disabled={fundLoading === a.id || !amount} style={{ padding: '6px 12px', fontSize: 12 }}>
                {fundLoading === a.id ? '...' : 'Credit'}
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminCustomersPage() {
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const email = accessToken ? decodeEmail(accessToken) : '';
  
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const loadData = () => {
    if (!accessToken) return;
    getAdminCustomers(accessToken)
      .then(setCustomers)
      .catch(e => {
        if (e instanceof ApiError && e.status === 403) {
          setErr('Admin access required. You are not authorized to view this page.');
        } else {
          setErr(e instanceof ApiError ? e.message : 'Failed to load customers');
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
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
          <button className="btn btn-ghost" onClick={() => navigate('/statements')}>Statements</button>
          <button className="btn btn-ghost" onClick={() => navigate('/notifications')}>Notifications</button>
          <button className="btn btn-ghost" onClick={() => navigate('/security')}>Security</button>
          <button className="btn btn-ghost" onClick={() => navigate('/admin/customers')} style={{ color: 'var(--accent)', background: 'rgba(99,102,241,0.1)' }}>Customers</button>
          <div className="user-chip"><span className="dot" />{email}</div>
          <button className="btn btn-ghost" onClick={() => { logout(); navigate('/'); }}>Sign out</button>
        </div>
      </header>

      <main className="main-content">
        <div style={{ marginBottom: 28 }}>
          <h1 className="section-title">Admin Customers</h1>
          <p className="text-sm text-muted" style={{ marginTop: 4 }}>Verify identities and fund accounts</p>
        </div>

        {loading && <div className="spinner" style={{ margin: '0 auto', borderColor: 'rgba(99,102,241,0.3)', borderTopColor: 'var(--accent)' }} />}
        
        {err && <div className="alert alert-error">⚠️ {err}</div>}

        {!loading && !err && customers.length === 0 && (
          <div className="alert alert-warn">No customers found.</div>
        )}

        {!loading && !err && customers.map(c => (
          <CustomerRow key={c.id} c={c} token={accessToken!} onChange={loadData} />
        ))}
      </main>
    </div>
  );
}
