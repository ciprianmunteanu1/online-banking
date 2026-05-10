import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { accountsApi } from '../api/client';
import { Wallet, TrendingUp, CreditCard, ArrowUpRight, ArrowDownRight, Plus } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface Account {
    id: string;
    iban: string;
    currency: string;
    balance: string;
    accountType: string;
    status: string;
}

export default function DashboardPage() {
    const { user } = useAuth();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            const { data } = await accountsApi.getAccounts();
            setAccounts(data);
        } catch {
            toast.error('Failed to load accounts');
        } finally {
            setLoading(false);
        }
    };

    const totalBalance = accounts.reduce(
        (sum, acc) => sum + parseFloat(acc.balance || '0'),
        0,
    );

    const createAccount = async (type: 'CURRENT' | 'SAVINGS') => {
        try {
            await accountsApi.createAccount({ currency: 'RON', accountType: type });
            toast.success(`${type.toLowerCase()} account created!`);
            fetchAccounts();
        } catch {
            toast.error('Failed to create account');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
            <Toaster position="top-right" />

            {/* Welcome Header */}
            <div>
                <h1 className="text-2xl lg:text-3xl font-bold">
                    Welcome back, <span className="gradient-text">{user?.firstName}</span>
                </h1>
                <p className="text-[var(--text-secondary)] mt-1">Here's an overview of your finances</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children">
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-indigo-400" />
                        </div>
                        <span className="text-xs text-green-400 flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" /> Active
                        </span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">Total Balance</p>
                    <p className="text-2xl font-bold mt-1">{totalBalance.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</p>
                </div>

                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <ArrowDownRight className="w-5 h-5 text-emerald-400" />
                        </div>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">Active Accounts</p>
                    <p className="text-2xl font-bold mt-1">{accounts.length}</p>
                </div>

                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-purple-400" />
                        </div>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">MFA Status</p>
                    <p className="text-2xl font-bold mt-1">{user?.mfaEnabled ? '✅ Enabled' : '⚠️ Disabled'}</p>
                </div>
            </div>

            {/* Accounts List */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Your Accounts</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => createAccount('CURRENT')}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium
                gradient-bg text-white hover:opacity-90 transition-all shadow-lg shadow-indigo-500/20"
                        >
                            <Plus className="w-4 h-4" /> Current
                        </button>
                        <button
                            onClick={() => createAccount('SAVINGS')}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium
                bg-white/5 border border-[var(--border)] text-[var(--text-secondary)]
                hover:text-white hover:border-indigo-500/30 transition-all"
                        >
                            <Plus className="w-4 h-4" /> Savings
                        </button>
                    </div>
                </div>

                <div className="space-y-3 stagger-children">
                    {accounts.map((account) => (
                        <div
                            key={account.id}
                            className="glass-card glass-card-hover p-5 flex items-center justify-between
                cursor-pointer transition-all duration-300"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${account.accountType === 'SAVINGS'
                                        ? 'bg-emerald-500/20'
                                        : 'bg-indigo-500/20'
                                    }`}>
                                    {account.accountType === 'SAVINGS' ? (
                                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                                    ) : (
                                        <Wallet className="w-5 h-5 text-indigo-400" />
                                    )}
                                </div>
                                <div>
                                    <p className="font-medium">{account.accountType} Account</p>
                                    <p className="text-sm text-[var(--text-muted)] font-mono">{account.iban}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-bold">
                                    {parseFloat(account.balance).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                                </p>
                                <p className="text-sm text-[var(--text-muted)]">{account.currency}</p>
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-[var(--text-muted)]" />
                        </div>
                    ))}

                    {accounts.length === 0 && (
                        <div className="glass-card p-12 text-center">
                            <Wallet className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
                            <p className="text-[var(--text-secondary)]">No accounts yet</p>
                            <p className="text-sm text-[var(--text-muted)]">Create your first account to get started</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
