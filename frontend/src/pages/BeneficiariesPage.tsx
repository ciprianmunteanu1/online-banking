import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  type Beneficiary,
  type CreateBeneficiaryRequest,
  createBeneficiary,
  deleteBeneficiary,
  getBeneficiaries,
} from '../api/beneficiaries';
import { ApiError } from '../api/client';
import { decodeEmail, useAuth } from '../context/AuthContext';

function BeneCard({
  ben,
  token,
  onDeleted,
}: {
  ben: Beneficiary;
  token: string;
  onDeleted: (id: string) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState('');

  async function handleDelete() {
    setDeleting(true);
    setErr('');
    try {
      await deleteBeneficiary(token, ben.id);
      onDeleted(ben.id);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Delete failed');
      setConfirm(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="bene-card">
      <div className="bene-name">{ben.displayName}</div>
      {ben.alias && <div className="bene-alias">"{ben.alias}"</div>}
      <div className="bene-iban">{ben.iban}</div>
      {err && <div style={{ fontSize: 12, color: 'var(--error)', marginTop: 6 }}>{err}</div>}
      <div className="bene-footer">
        <span className="bene-date">{new Date(ben.createdAt).toLocaleDateString('ro-RO')}</span>
        {!confirm ? (
          <button className="btn btn-danger" onClick={() => setConfirm(true)}>
            Delete
          </button>
        ) : (
          <div className="flex items-center gap-8">
            <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }}
              onClick={() => setConfirm(false)} disabled={deleting}>
              Cancel
            </button>
            <button className="btn btn-confirm" onClick={handleDelete} disabled={deleting}>
              {deleting ? '…' : 'Confirm'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BeneficiariesPage() {
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const email = accessToken ? decodeEmail(accessToken) : '';

  const [benes, setBenes] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [listErr, setListErr] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [iban, setIban] = useState('');
  const [alias, setAlias] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [formOk, setFormOk] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    getBeneficiaries(accessToken)
      .then(setBenes)
      .catch(e => setListErr(e instanceof ApiError ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [accessToken]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setFormErr('');
    setFormOk('');
    setSubmitting(true);
    const body: CreateBeneficiaryRequest = { name: name.trim(), iban: iban.trim() };
    if (alias.trim()) body.alias = alias.trim();
    try {
      const created = await createBeneficiary(accessToken, body);
      setBenes(prev => [created, ...prev]);
      setName('');
      setIban('');
      setAlias('');
      setFormOk(`✅ "${created.displayName}" added successfully.`);
    } catch (e) {
      setFormErr(e instanceof ApiError ? e.message : 'Failed to create beneficiary');
    } finally {
      setSubmitting(false);
    }
  }

  function handleDeleted(id: string) {
    setBenes(prev => prev.filter(b => b.id !== id));
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
          <button className="btn btn-ghost" onClick={() => navigate('/beneficiaries')} style={{ color: 'var(--accent)', background: 'rgba(99,102,241,0.1)' }}>Beneficiaries</button>
          <button className="btn btn-ghost" onClick={() => navigate('/notifications')}>Notifications</button>
          <button className="btn btn-ghost" onClick={() => navigate('/security')}>Security</button>
          <button className="btn btn-ghost" onClick={() => navigate('/admin/customers')}>Admin</button>
          <div className="user-chip"><span className="dot" />{email}</div>
          <button id="btn-logout-bene" className="btn btn-ghost" onClick={() => { logout(); navigate('/'); }}>
            Sign out
          </button>
        </div>
      </header>

      <main className="main-content">
        <div style={{ marginBottom: 28 }}>
          <h1 className="section-title">Beneficiaries</h1>
          <p className="text-sm text-muted" style={{ marginTop: 4 }}>
            Saved payees for future transfers
          </p>
        </div>

        <div className="bene-layout">
          {/* Left: list */}
          <div>
            {loading && (
              <div className="flex items-center gap-8">
                <span className="spinner" style={{ borderColor: 'rgba(99,102,241,0.3)', borderTopColor: 'var(--accent)' }} />
                <span className="text-muted">Loading…</span>
              </div>
            )}
            {listErr && <div className="alert alert-error">⚠️ {listErr}</div>}
            {!loading && !listErr && benes.length === 0 && (
              <div className="alert alert-warn">
                No beneficiaries yet. Add one using the form.
              </div>
            )}
            {benes.length > 0 && (
              <>
                <p className="text-sm text-muted" style={{ marginBottom: 4 }}>
                  {benes.length} active beneficiar{benes.length !== 1 ? 'ies' : 'y'}
                </p>
                <div className="bene-grid">
                  {benes.map(b => (
                    <BeneCard key={b.id} ben={b} token={accessToken!} onDeleted={handleDeleted} />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right: form */}
          <div className="card bene-form-card">
            <h2 className="section-title" style={{ fontSize: 16, marginBottom: 20 }}>
              Add Beneficiary
            </h2>
            {formErr && <div className="alert alert-error">⚠️ {formErr}</div>}
            {formOk && <div className="alert alert-success">{formOk}</div>}
            <form onSubmit={handleCreate} noValidate>
              <div className="field">
                <label htmlFor="bene-name">Name *</label>
                <input id="bene-name" type="text" maxLength={100} value={name}
                  onChange={e => setName(e.target.value)} placeholder="e.g. John Doe" required />
              </div>
              <div className="field">
                <label htmlFor="bene-iban">IBAN *</label>
                <input id="bene-iban" type="text" maxLength={34} value={iban}
                  onChange={e => setIban(e.target.value.toUpperCase())}
                  placeholder="e.g. RO49AAAA1B31007593840000" required
                  style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }} />
              </div>
              <div className="field" style={{ marginBottom: 20 }}>
                <label htmlFor="bene-alias">Alias (optional)</label>
                <input id="bene-alias" type="text" maxLength={100} value={alias}
                  onChange={e => setAlias(e.target.value)} placeholder="e.g. My friend John" />
              </div>
              <button id="btn-add-bene" type="submit" className="btn btn-primary"
                disabled={submitting || !name.trim() || !iban.trim()}>
                {submitting ? <span className="spinner" /> : null}
                {submitting ? 'Adding…' : 'Add Beneficiary'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
