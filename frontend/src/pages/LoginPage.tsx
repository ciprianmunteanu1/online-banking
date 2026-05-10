import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { savePreMfaToken } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('demo@bank.local');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email.trim(), password);
      savePreMfaToken(res.accessToken);
      navigate('/mfa');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-center">
      <div className="card auth-card">
        <div className="logo">
          <div className="logo-icon">🏦</div>
          <div className="logo-name">Secure<span>Bank</span></div>
        </div>

        <h1 className="page-title">Welcome back</h1>
        <p className="page-subtitle">Sign in to your account</p>

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            id="btn-login"
            type="submit"
            className="btn btn-primary"
            disabled={loading || !email || !password}
          >
            {loading ? <span className="spinner" /> : null}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-sm text-muted mt-16" style={{ textAlign: 'center' }}>
          Demo: <code>demo@bank.local</code> / <code>Password123!</code>
        </p>
        <div className="divider" style={{ margin: '16px 0' }} />
        <p className="text-sm text-muted" style={{ textAlign: 'center' }}>
          New to SecureBank?{' '}
          <Link to="/register" style={{ color: 'var(--accent-light, #818cf8)', textDecoration: 'none', fontWeight: 500 }}>
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
