import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/client';
import { Building2, AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function RegisterPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const passwordChecks = [
        { label: 'At least 8 characters', test: form.password.length >= 8 },
        { label: 'One uppercase letter', test: /[A-Z]/.test(form.password) },
        { label: 'One lowercase letter', test: /[a-z]/.test(form.password) },
        { label: 'One number', test: /\d/.test(form.password) },
        { label: 'One special character', test: /[@$!%*?&]/.test(form.password) },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (!passwordChecks.every((c) => c.test)) {
            setError('Password does not meet requirements');
            return;
        }

        setLoading(true);
        try {
            await authApi.register({
                email: form.email,
                password: form.password,
                firstName: form.firstName,
                lastName: form.lastName,
            });
            toast.success('Account created successfully!');
            navigate('/login');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const update = (field: string, value: string) =>
        setForm((prev) => ({ ...prev, [field]: value }));

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            <Toaster position="top-right" />

            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/3 -left-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/3 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md relative animate-fadeIn">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-bg mb-4 shadow-lg shadow-indigo-500/30">
                        <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold gradient-text">Create Account</h1>
                    <p className="text-[var(--text-secondary)] mt-2">Start your banking journey</p>
                </div>

                <div className="glass-card p-8">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">First Name</label>
                                <input
                                    type="text" value={form.firstName} onChange={(e) => update('firstName', e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-[var(--border)] text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500 transition-all"
                                    placeholder="John" required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Last Name</label>
                                <input
                                    type="text" value={form.lastName} onChange={(e) => update('lastName', e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-[var(--border)] text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500 transition-all"
                                    placeholder="Doe" required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Email</label>
                            <input
                                type="email" value={form.email} onChange={(e) => update('email', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-[var(--border)] text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500 transition-all"
                                placeholder="you@example.com" required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'} value={form.password}
                                    onChange={(e) => update('password', e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-[var(--border)] text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500 transition-all pr-12"
                                    placeholder="Create a strong password" required
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white">
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {form.password && (
                                <div className="mt-2 space-y-1">
                                    {passwordChecks.map((check, i) => (
                                        <div key={i} className={`flex items-center gap-2 text-xs ${check.test ? 'text-green-400' : 'text-[var(--text-muted)]'}`}>
                                            <CheckCircle2 className={`w-3.5 h-3.5 ${check.test ? 'text-green-400' : 'text-[var(--text-muted)]'}`} />
                                            {check.label}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Confirm Password</label>
                            <input
                                type="password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-[var(--border)] text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500 transition-all"
                                placeholder="Repeat your password" required
                            />
                        </div>

                        <button type="submit" disabled={loading}
                            className="w-full py-3 rounded-xl gradient-bg text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]">
                            {loading ? (
                                <span className="inline-flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating Account...
                                </span>
                            ) : 'Create Account'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-[var(--text-muted)]">
                            Already have an account?{' '}
                            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">Sign in</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
