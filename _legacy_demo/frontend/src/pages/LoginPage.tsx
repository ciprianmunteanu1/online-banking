import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/client';
import { Eye, EyeOff, Building2, AlertCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mfaCode, setMfaCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [requiresMfa, setRequiresMfa] = useState(false);
    const [tempToken, setTempToken] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const deviceInfo = navigator.userAgent;

            if (requiresMfa) {
                const { data } = await authApi.mfaLogin({
                    tempToken,
                    mfaCode,
                    deviceInfo,
                });

                if (data.error) {
                    setError(data.error);
                    return;
                }

                login(data.accessToken, data.refreshToken, data.user);
                toast.success('Login successful!');
                navigate('/dashboard');
            } else {
                const { data } = await authApi.login({ email, password, deviceInfo });

                if (data.requiresMfa) {
                    setRequiresMfa(true);
                    setTempToken(data.tempToken);
                    return;
                }

                login(data.accessToken, data.refreshToken, data.user);
                toast.success('Login successful!');
                navigate('/dashboard');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            <Toaster position="top-right" />

            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md relative animate-fadeIn">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-bg mb-4 shadow-lg shadow-indigo-500/30">
                        <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold gradient-text">SecureBank</h1>
                    <p className="text-[var(--text-secondary)] mt-2">Sign in to your account</p>
                </div>

                {/* Login Form */}
                <div className="glass-card p-8">
                    <form onSubmit={handleLogin} className="space-y-5">
                        {error && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {!requiresMfa ? (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-[var(--border)]
                      text-white placeholder-[var(--text-muted)]
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                      transition-all duration-200"
                                        placeholder="you@example.com"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-[var(--border)]
                        text-white placeholder-[var(--text-muted)]
                        focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                        transition-all duration-200 pr-12"
                                            placeholder="Enter your password"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]
                        hover:text-white transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="animate-fadeIn">
                                <div className="text-center mb-4">
                                    <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-3">
                                        <Shield className="w-6 h-6 text-indigo-400" />
                                    </div>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        Enter your 6-digit authentication code
                                    </p>
                                </div>
                                <input
                                    type="text"
                                    value={mfaCode}
                                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono
                    rounded-xl bg-white/5 border border-[var(--border)] text-white
                    focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                    transition-all duration-200"
                                    placeholder="000000"
                                    maxLength={6}
                                    required
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 rounded-xl gradient-bg text-white font-semibold
                hover:opacity-90 disabled:opacity-50 transition-all duration-200
                shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
                        >
                            {loading ? (
                                <span className="inline-flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Signing in...
                                </span>
                            ) : requiresMfa ? (
                                'Verify Code'
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-[var(--text-muted)]">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium">
                                Create one
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Shield(props: any) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
    );
}
