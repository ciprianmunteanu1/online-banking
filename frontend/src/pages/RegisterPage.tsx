import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../api/auth';
import { ApiError } from '../api/client';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), password });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="page-center">
        <div className="card auth-card" style={{ textAlign: 'center' }}>
          <div className="logo" style={{ justifyContent: 'center' }}>
            <div className="logo-icon">🏦</div>
            <div className="logo-name">Secure<span>Bank</span></div>
          </div>
          <div className="alert alert-success">
            ✅ Account created successfully!
          </div>
          <p className="text-sm text-muted" style={{ marginBottom: 24 }}>
            Your account and a default checking account are ready.
            Sign in to access your dashboard.
          </p>
          <button id="btn-go-signin" className="btn btn-primary" onClick={() => navigate('/')}>
            Sign in now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-center">
      <div className="card auth-card">
        <div className="logo">
          <div className="logo-icon">🏦</div>
          <div className="logo-name">Secure<span>Bank</span></div>
        </div>

        <h1 className="page-title">Create account</h1>
        <p className="page-subtitle">Open your online banking account in seconds</p>

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label htmlFor="reg-first">First name</label>
              <input id="reg-first" type="text" maxLength={100} value={firstName}
                onChange={e => setFirstName(e.target.value)} placeholder="Jane" required />
            </div>
            <div className="field">
              <label htmlFor="reg-last">Last name</label>
              <input id="reg-last" type="text" maxLength={100} value={lastName}
                onChange={e => setLastName(e.target.value)} placeholder="Doe" required />
            </div>
          </div>

          <div className="field">
            <label htmlFor="reg-email">Email address</label>
            <input id="reg-email" type="email" maxLength={255} value={email}
              onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
              autoComplete="email" required />
          </div>

          <div className="field">
            <label htmlFor="reg-password">Password</label>
            <input id="reg-password" type="password" minLength={8} value={password}
              onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters"
              autoComplete="new-password" required />
            {password.length > 0 && password.length < 8 && (
              <span style={{ fontSize: 12, color: 'var(--error)' }}>
                Password must be at least 8 characters
              </span>
            )}
          </div>

          <button id="btn-register" type="submit" className="btn btn-primary"
            disabled={loading || !firstName.trim() || !lastName.trim() || !email.trim() || password.length < 8}>
            {loading ? <span className="spinner" /> : null}
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-muted mt-16" style={{ textAlign: 'center' }}>
          Already have an account?{' '}
          <Link to="/" style={{ color: 'var(--accent-light, #818cf8)', textDecoration: 'none', fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
