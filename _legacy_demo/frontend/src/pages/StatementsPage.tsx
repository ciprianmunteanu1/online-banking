import { useState, useEffect } from 'react';
import { accountsApi, statementsApi } from '../api/client';
import { FileText, Download, ArrowDownRight, ArrowUpRight, Calendar } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface Account {
    id: string;
    iban: string;
    currency: string;
    balance: string;
}

interface StatementEntry {
    id: string;
    type: 'DEBIT' | 'CREDIT';
    amount: number;
    referenceId: string;
    description: string | null;
    status: string;
    date: string;
}

interface StatementData {
    account: { id: string; iban: string; currency: string; currentBalance: number };
    period: { from: string; to: string };
    entries: StatementEntry[];
    summary: {
        totalDebits: number;
        totalCredits: number;
        netChange: number;
        transactionCount: number;
    };
}

export default function StatementsPage() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedAccount, setSelectedAccount] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [statement, setStatement] = useState<StatementData | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        accountsApi.getAccounts().then((r) => setAccounts(r.data));

        // Default date range: last 30 days
        const now = new Date();
        const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        setTo(now.toISOString().split('T')[0]);
        setFrom(past.toISOString().split('T')[0]);
    }, []);

    const handleFetch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAccount) return;
        setLoading(true);

        try {
            const { data } = await statementsApi.getStatement(selectedAccount, from, to);
            setStatement(data);
        } catch {
            toast.error('Failed to fetch statement');
        } finally {
            setLoading(false);
        }
    };

    const downloadCsv = () => {
        if (!statement) return;

        const headers = 'Date,Type,Amount,Description,Reference,Status\n';
        const rows = statement.entries
            .map(
                (e) =>
                    `${new Date(e.date).toLocaleDateString()},${e.type},${e.amount},${e.description || ''},${e.referenceId},${e.status}`,
            )
            .join('\n');

        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `statement-${statement.account.iban}-${from}-${to}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Statement downloaded');
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
            <Toaster position="top-right" />

            <div>
                <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
                    <FileText className="w-8 h-8 text-indigo-400" />
                    <span className="gradient-text">Account Statements</span>
                </h1>
                <p className="text-[var(--text-secondary)] mt-1">
                    View and download your transaction history
                </p>
            </div>

            {/* Filters */}
            <div className="glass-card p-6">
                <form onSubmit={handleFetch} className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Account</label>
                        <select
                            value={selectedAccount}
                            onChange={(e) => setSelectedAccount(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-[var(--border)]
                text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                            required
                        >
                            <option value="" className="bg-gray-900">Select account</option>
                            {accounts.map((acc) => (
                                <option key={acc.id} value={acc.id} className="bg-gray-900">
                                    {acc.iban} ({acc.currency})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="w-40">
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            <Calendar className="w-3.5 h-3.5 inline mr-1" /> From
                        </label>
                        <input
                            type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-[var(--border)]
                text-white focus:outline-none focus:border-indigo-500 transition-all"
                            required
                        />
                    </div>

                    <div className="w-40">
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            <Calendar className="w-3.5 h-3.5 inline mr-1" /> To
                        </label>
                        <input
                            type="date" value={to} onChange={(e) => setTo(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-[var(--border)]
                text-white focus:outline-none focus:border-indigo-500 transition-all"
                            required
                        />
                    </div>

                    <button
                        type="submit" disabled={loading}
                        className="px-6 py-2.5 rounded-xl gradient-bg text-white font-semibold
              hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20"
                    >
                        {loading ? 'Loading...' : 'Generate'}
                    </button>
                </form>
            </div>

            {/* Statement Results */}
            {statement && (
                <div className="space-y-6 animate-fadeIn">
                    {/* Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="glass-card p-4">
                            <p className="text-xs text-[var(--text-muted)]">Total Credits</p>
                            <p className="text-lg font-bold text-emerald-400">
                                +{statement.summary.totalCredits.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="glass-card p-4">
                            <p className="text-xs text-[var(--text-muted)]">Total Debits</p>
                            <p className="text-lg font-bold text-red-400">
                                -{statement.summary.totalDebits.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="glass-card p-4">
                            <p className="text-xs text-[var(--text-muted)]">Net Change</p>
                            <p className={`text-lg font-bold ${statement.summary.netChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {statement.summary.netChange >= 0 ? '+' : ''}{statement.summary.netChange.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="glass-card p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-[var(--text-muted)]">Transactions</p>
                                <p className="text-lg font-bold">{statement.summary.transactionCount}</p>
                            </div>
                            <button
                                onClick={downloadCsv}
                                className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors"
                                title="Download CSV"
                            >
                                <Download className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Entries Table */}
                    <div className="glass-card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-[var(--border)]">
                                        <th className="text-left px-6 py-4 text-xs font-medium text-[var(--text-muted)] uppercase">Date</th>
                                        <th className="text-left px-6 py-4 text-xs font-medium text-[var(--text-muted)] uppercase">Type</th>
                                        <th className="text-left px-6 py-4 text-xs font-medium text-[var(--text-muted)] uppercase">Description</th>
                                        <th className="text-right px-6 py-4 text-xs font-medium text-[var(--text-muted)] uppercase">Amount</th>
                                        <th className="text-center px-6 py-4 text-xs font-medium text-[var(--text-muted)] uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {statement.entries.map((entry) => (
                                        <tr key={entry.id} className="border-b border-[var(--border)] hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                                                {new Date(entry.date).toLocaleDateString('ro-RO')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 text-sm ${entry.type === 'CREDIT' ? 'text-emerald-400' : 'text-red-400'
                                                    }`}>
                                                    {entry.type === 'CREDIT' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                                    {entry.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm">{entry.description || '—'}</td>
                                            <td className={`px-6 py-4 text-sm text-right font-medium ${entry.type === 'CREDIT' ? 'text-emerald-400' : 'text-red-400'
                                                }`}>
                                                {entry.type === 'CREDIT' ? '+' : '-'}{entry.amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`text-xs px-2 py-1 rounded-full ${entry.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' :
                                                        entry.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                                                            'bg-yellow-500/20 text-yellow-400'
                                                    }`}>
                                                    {entry.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {statement.entries.length === 0 && (
                            <div className="p-12 text-center">
                                <FileText className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-2" />
                                <p className="text-[var(--text-secondary)]">No transactions in this period</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
