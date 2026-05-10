import { type KeyboardEvent, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyMfa } from '../api/auth';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';

const OTP_LEN = 6;

export default function MfaPage() {
  const { preMfaToken, saveAccessToken } = useAuth();
  const navigate = useNavigate();
  const [digits, setDigits] = useState<string[]>(Array(OTP_LEN).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  if (!preMfaToken) {
    navigate('/', { replace: true });
    return null;
  }

  function update(idx: number, val: string) {
    const d = [...digits];
    d[idx] = val.slice(-1).replace(/\D/, '');
    setDigits(d);
    if (d[idx] && idx < OTP_LEN - 1) refs.current[idx + 1]?.focus();
    if (d.every(c => c !== '')) submitOtp(d.join(''));
  }

  function handleKey(idx: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  }

  async function submitOtp(otp: string) {
    setError('');
    setLoading(true);
    try {
      const res = await verifyMfa(preMfaToken!, otp);
      saveAccessToken(res.accessToken);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid OTP. Try again.');
      setDigits(Array(OTP_LEN).fill(''));
      setTimeout(() => refs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-center">
      <div className="card auth-card" style={{ maxWidth: 440, textAlign: 'center' }}>
        <div className="logo" style={{ justifyContent: 'center' }}>
          <div className="logo-icon">🔐</div>
          <div className="logo-name">Secure<span>Bank</span></div>
        </div>

        <h1 className="page-title">Two-factor authentication</h1>
        <p className="page-subtitle">
          Enter the 6-digit OTP printed in your server logs
          <br />
          <code style={{ fontSize: 12, color: 'var(--text-3)' }}>[MFA mock] OTP for …</code>
        </p>

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        <div className="otp-boxes">
          {digits.map((d, i) => (
            <input
              key={i}
              id={`otp-${i}`}
              ref={el => { refs.current[i] = el; }}
              className="otp-box"
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              autoFocus={i === 0}
              disabled={loading}
              onChange={e => update(i, e.target.value)}
              onKeyDown={e => handleKey(i, e)}
            />
          ))}
        </div>

        {loading && (
          <div className="flex items-center gap-8" style={{ justifyContent: 'center', marginTop: 16 }}>
            <span className="spinner" />
            <span className="text-sm text-muted">Verifying…</span>
          </div>
        )}

        <div className="divider" />
        <button
          id="btn-back-to-login"
          className="btn btn-ghost"
          onClick={() => navigate('/')}
          style={{ width: '100%' }}
        >
          ← Back to sign in
        </button>
      </div>
    </div>
  );
}
