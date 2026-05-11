import { useEffect, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { decodeEmail, useAuth } from '../context/AuthContext';
import { type Account, getAccounts } from '../api/accounts';
import { type StatementResponse, getStatement } from '../api/statements';
import { ApiError } from '../api/client';

export default function StatementsPage() {
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const email = accessToken ? decodeEmail(accessToken) : '';

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [statement, setStatement] = useState<StatementResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    getAccounts(accessToken).then(accs => {
      const activeNonSystem = accs.filter(a => a.status === 'ACTIVE');
      setAccounts(activeNonSystem);
      if (activeNonSystem.length > 0) setSelectedAccountId(activeNonSystem[0].id);
    }).catch(() => {});
  }, [accessToken]);

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    if (!accessToken || !selectedAccountId || !fromDate || !toDate) return;
    setLoading(true);
    setErrorMsg('');
    setStatement(null);
    try {
      const res = await getStatement(accessToken, { accountId: selectedAccountId, from: fromDate, to: toDate });
      setStatement(res);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Failed to generate statement');
    } finally {
      setLoading(false);
    }
  }

  function handleExportCsv() {
    if (!statement) return;
    const headers = ['Date', 'Type', 'Description', 'Side', 'Amount', 'Currency', 'Transaction ID'];
    const rows = statement.entries.map(e => [
      new Date(e.createdAt).toLocaleString(),
      e.transactionType,
      e.description || '',
      e.side,
      e.amount,
      e.currency,
      e.transactionId
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.map(field => `"${field}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Statement_${statement.account.iban}_${statement.period.from}_${statement.period.to}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          <button className="btn btn-ghost" onClick={() => navigate('/statements')} style={{ color: 'var(--accent)', background: 'rgba(99,102,241,0.1)' }}>Statements</button>
          <button className="btn btn-ghost" onClick={() => navigate('/beneficiaries')}>Beneficiaries</button>
          <button className="btn btn-ghost" onClick={() => navigate('/notifications')}>Notifications</button>
          <button className="btn btn-ghost" onClick={() => navigate('/admin/customers')}>Admin</button>
          <div className="user-chip"><span className="dot" />{email}</div>
          <button id="btn-logout" className="btn btn-ghost" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <main className="main-content">
        <h1 className="section-title">Account Statements</h1>

        <form className="card" style={{ padding: 24, marginBottom: 24, display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }} onSubmit={handleGenerate}>
          <div className="field" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
            <label>Select Account</label>
            <select value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} required>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.accountType} - {a.iban}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ width: 160, marginBottom: 0 }}>
            <label>From</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} required />
          </div>
          <div className="field" style={{ width: 160, marginBottom: 0 }}>
            <label>To</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ height: 42 }} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Statement'}
          </button>
        </form>

        {errorMsg && (
          <div className="alert alert-error" style={{ marginBottom: 20 }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {statement && (
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 18, marginBottom: 4 }}>Statement for {statement.account.accountType}</h2>
                <div className="text-sm text-muted font-mono">{statement.account.iban}</div>
              </div>
              <button className="btn btn-secondary" onClick={handleExportCsv}>
                Export CSV
              </button>
            </div>

            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
              <div style={{ background: 'var(--surface-raised)', padding: 16, borderRadius: 8 }}>
                <div className="text-sm text-muted">Opening Balance</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{parseFloat(statement.openingBalance).toFixed(2)} {statement.account.currency}</div>
              </div>
              <div style={{ background: 'var(--surface-raised)', padding: 16, borderRadius: 8 }}>
                <div className="text-sm text-muted">Total Debits</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--error)' }}>-{parseFloat(statement.totalDebits).toFixed(2)} {statement.account.currency}</div>
              </div>
              <div style={{ background: 'var(--surface-raised)', padding: 16, borderRadius: 8 }}>
                <div className="text-sm text-muted">Total Credits</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--success)' }}>+{parseFloat(statement.totalCredits).toFixed(2)} {statement.account.currency}</div>
              </div>
              <div style={{ background: 'var(--surface-raised)', padding: 16, borderRadius: 8 }}>
                <div className="text-sm text-muted">Closing Balance</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{parseFloat(statement.closingBalance).toFixed(2)} {statement.account.currency}</div>
              </div>
            </div>

            <h3 style={{ fontSize: 16, marginBottom: 16 }}>Ledger Entries</h3>
            {statement.entries.length === 0 ? (
              <div className="text-muted" style={{ padding: 24, textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
                No entries found for this period.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                      <th style={{ padding: '12px 8px', color: 'var(--text-3)', fontWeight: 500 }}>Date</th>
                      <th style={{ padding: '12px 8px', color: 'var(--text-3)', fontWeight: 500 }}>Description</th>
                      <th style={{ padding: '12px 8px', color: 'var(--text-3)', fontWeight: 500 }}>Type</th>
                      <th style={{ padding: '12px 8px', color: 'var(--text-3)', fontWeight: 500, textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statement.entries.map(e => (
                      <tr key={e.ledgerEntryId} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 8px' }}>{new Date(e.createdAt).toLocaleString()}</td>
                        <td style={{ padding: '12px 8px' }}>{e.description || '-'}</td>
                        <td style={{ padding: '12px 8px' }}>
                          <span className={`status-badge ${e.transactionStatus === 'COMPLETED' ? 'success' : 'pending'}`}>
                            {e.transactionType}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 500, color: e.side === 'CREDIT' ? 'var(--success)' : 'var(--text)' }}>
                          {e.side === 'CREDIT' ? '+' : '-'}{parseFloat(e.amount).toFixed(2)} {e.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
