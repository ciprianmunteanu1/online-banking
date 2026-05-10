import { useState, useEffect } from 'react';
import { accountsApi, transactionsApi, authApi } from '../api/client';
import { ArrowLeftRight, AlertCircle, CheckCircle2, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// We'll generate uuid on client side
function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

interface Account {
    id: string;
    iban: string;
    currency: string;
    balance: string;
    accountType: string;
}

export default function TransfersPage() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(false);
    const [showStepUp, setShowStepUp] = useState(false);
    const [stepUpCode, setStepUpCode] = useState('');
    const [form, setForm] = useState({
        sourceAccountId: '',
        destinationIban: '',
        amount: '',
        currency: 'RON',
        description: '',
    });
    const [result, setResult] = useState<any>(null);

    useEffect(() => {
        accountsApi.getAccounts().then((res) => setAccounts(res.data));
    }, []);

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        setResult(null);
        setLoading(true);

        try {
            const { data } = await transactionsApi.createTransfer({
                sourceAccountId: form.sourceAccountId,
                destinationIban: form.destinationIban,
                amount: parseFloat(form.amount),
                currency: form.currency,
                idempotencyKey: generateId(),
                description: form.description || undefined,
            });

            if (data.error === 'STEP_UP_REQUIRED') {
                setShowStepUp(true);
                setLoading(false);
                return;
            }

            setResult(data);
            if (data.transaction?.status === 'COMPLETED') {
                toast.success('Transfer completed!');
            } else if (data.transaction?.status === 'REJECTED') {
                toast.error('Transfer rejected');
            } else {
                toast('Transfer pending review', { icon: '⏳' });
            }

            // Refresh accounts
            accountsApi.getAccounts().then((res) => setAccounts(res.data));
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Transfer failed');
        } finally {
            setLoading(false);
        }
    };

    const handleStepUp = async () => {
        try {
            const { data } = await authApi.verifyStepUp(stepUpCode);
            localStorage.setItem('accessToken', data.accessToken);
            setShowStepUp(false);
            setStepUpCode('');
            toast.success('Step-up verified! Please retry the transfer.');
        } catch {
            toast.error('Invalid MFA code');
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
            <Toaster position="top-right" />

            <div>
                <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
                    <ArrowLeftRight className="w-8 h-8 text-indigo-400" />
                    <span className="gradient-text">Transfers</span>
                </h1>
                <p className="text-[var(--text-secondary)] mt-1">
                    Send money to your accounts or other beneficiaries
                </p>
            </div>

            <div className="glass-card p-6 lg:p-8">
                <form onSubmit={handleTransfer} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Source Account
                        </label>
                        <select
                            value={form.sourceAccountId}
                            onChange={(e) => setForm({ ...form, sourceAccountId: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-[var(--border)]
                text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                            required
                        >
                            <option value="" className="bg-gray-900">Select account</option>
                            {accounts.map((acc) => (
                                <option key={acc.id} value={acc.id} className="bg-gray-900">
                                    {acc.iban} — {parseFloat(acc.balance).toLocaleString('ro-RO')} {acc.currency}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Destination IBAN
                        </label>
                        <input
                            type="text"
                            value={form.destinationIban}
                            onChange={(e) => setForm({ ...form, destinationIban: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-[var(--border)]
                text-white placeholder-[var(--text-muted)] font-mono
                focus:outline-none focus:border-indigo-500 transition-all"
                            placeholder="RO00OBKR0000000000000000"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Amount
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={form.amount}
                                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-[var(--border)]
                  text-white placeholder-[var(--text-muted)]
                  focus:outline-none focus:border-indigo-500 transition-all"
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Currency
                            </label>
                            <select
                                value={form.currency}
                                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-[var(--border)]
                  text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                            >
                                <option value="RON" className="bg-gray-900">RON</option>
                                <option value="EUR" className="bg-gray-900">EUR</option>
                                <option value="USD" className="bg-gray-900">USD</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Description (optional)
                        </label>
                        <input
                            type="text"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-[var(--border)]
                text-white placeholder-[var(--text-muted)]
                focus:outline-none focus:border-indigo-500 transition-all"
                            placeholder="Payment for..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 rounded-xl gradient-bg text-white font-semibold
              hover:opacity-90 disabled:opacity-50 transition-all duration-200
              shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
                    >
                        {loading ? (
                            <span className="inline-flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Processing...
                            </span>
                        ) : (
                            'Send Transfer'
                        )}
                    </button>
                </form>

                {/* Transfer Result */}
                {result && (
                    <div className={`mt-6 p-4 rounded-xl border animate-fadeIn ${result.transaction?.status === 'COMPLETED'
                        ? 'bg-emerald-500/10 border-emerald-500/20'
                        : result.transaction?.status === 'REJECTED'
                            ? 'bg-red-500/10 border-red-500/20'
                            : 'bg-yellow-500/10 border-yellow-500/20'
                        }`}>
                        <div className="flex items-center gap-2 mb-2">
                            {result.transaction?.status === 'COMPLETED' ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-yellow-400" />
                            )}
                            <span className="font-medium">{result.message}</span>
                        </div>
                        {result.riskScore !== undefined && (
                            <p className="text-sm text-[var(--text-muted)]">
                                Risk Score: {result.riskScore}/100
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Step-Up Auth Modal */}
            {showStepUp && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="glass-card p-8 max-w-sm w-full mx-4 animate-fadeIn">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Step-Up Verification</h3>
                            <button onClick={() => setShowStepUp(false)} className="text-[var(--text-muted)] hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] mb-4">
                            This transfer requires additional verification. Enter your MFA code.
                        </p>
                        <input
                            type="text"
                            value={stepUpCode}
                            onChange={(e) => setStepUpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="w-full px-4 py-3 text-center text-xl tracking-[0.5em] font-mono
                rounded-xl bg-white/5 border border-[var(--border)] text-white
                focus:outline-none focus:border-indigo-500 transition-all"
                            placeholder="000000"
                            maxLength={6}
                        />
                        <button
                            onClick={handleStepUp}
                            className="w-full mt-4 py-3 rounded-xl gradient-bg text-white font-semibold
                hover:opacity-90 transition-all shadow-lg shadow-indigo-500/20"
                        >
                            Verify & Continue
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
