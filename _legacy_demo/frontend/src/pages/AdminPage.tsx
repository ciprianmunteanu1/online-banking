import { useState, useEffect } from 'react';
import { adminApi } from '../api/client';
import { Shield, AlertTriangle, FileSearch, ChevronLeft, ChevronRight } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function AdminPage() {
    const [tab, setTab] = useState<'suspicious' | 'audit'>('suspicious');
    const [suspiciousTx, setSuspiciousTx] = useState<any>({ data: [], pagination: {} });
    const [auditLogs, setAuditLogs] = useState<any>({ data: [], pagination: {} });
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [severity, setSeverity] = useState('');

    useEffect(() => {
        setPage(1);
        fetchData();
    }, [tab, severity]);

    useEffect(() => {
        fetchData();
    }, [page]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (tab === 'suspicious') {
                const { data } = await adminApi.getSuspiciousTransactions({ page, limit: 15 });
                setSuspiciousTx(data);
            } else {
                const { data } = await adminApi.getAuditLogs({
                    page,
                    limit: 20,
                    severity: severity || undefined,
                });
                setAuditLogs(data);
            }
        } catch {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const currentData = tab === 'suspicious' ? suspiciousTx : auditLogs;

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
            <Toaster position="top-right" />

            <div>
                <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
                    <Shield className="w-8 h-8 text-indigo-400" />
                    <span className="gradient-text">Admin Dashboard</span>
                </h1>
                <p className="text-[var(--text-secondary)] mt-1">Monitor security and system activity</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                <button
                    onClick={() => setTab('suspicious')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === 'suspicious'
                            ? 'gradient-bg text-white shadow-lg shadow-indigo-500/20'
                            : 'bg-white/5 text-[var(--text-secondary)] hover:text-white'
                        }`}
                >
                    <AlertTriangle className="w-4 h-4" /> Suspicious Transactions
                </button>
                <button
                    onClick={() => setTab('audit')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === 'audit'
                            ? 'gradient-bg text-white shadow-lg shadow-indigo-500/20'
                            : 'bg-white/5 text-[var(--text-secondary)] hover:text-white'
                        }`}
                >
                    <FileSearch className="w-4 h-4" /> Audit Logs
                </button>

                {tab === 'audit' && (
                    <select
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value)}
                        className="ml-auto px-4 py-2 rounded-xl bg-white/5 border border-[var(--border)]
              text-sm text-[var(--text-secondary)] focus:outline-none focus:border-indigo-500
              transition-all appearance-none"
                    >
                        <option value="" className="bg-gray-900">All Severities</option>
                        <option value="LOW" className="bg-gray-900">Low</option>
                        <option value="MEDIUM" className="bg-gray-900">Medium</option>
                        <option value="HIGH" className="bg-gray-900">High</option>
                        <option value="CRITICAL" className="bg-gray-900">Critical</option>
                    </select>
                )}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : tab === 'suspicious' ? (
                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[var(--border)]">
                                    <th className="text-left px-6 py-4 text-xs font-medium text-[var(--text-muted)] uppercase">Date</th>
                                    <th className="text-left px-6 py-4 text-xs font-medium text-[var(--text-muted)] uppercase">Reference</th>
                                    <th className="text-right px-6 py-4 text-xs font-medium text-[var(--text-muted)] uppercase">Amount</th>
                                    <th className="text-center px-6 py-4 text-xs font-medium text-[var(--text-muted)] uppercase">Risk</th>
                                    <th className="text-center px-6 py-4 text-xs font-medium text-[var(--text-muted)] uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {suspiciousTx.data.map((tx: any) => (
                                    <tr key={tx.id} className="border-b border-[var(--border)] hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                                            {new Date(tx.createdAt).toLocaleString('ro-RO')}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-mono text-[var(--text-muted)]">
                                            {tx.referenceId.slice(0, 8)}...
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right font-medium">
                                            {parseFloat(tx.amount).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} {tx.currency}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${tx.riskScore >= 80 ? 'bg-red-500/20 text-red-400' :
                                                    tx.riskScore >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                                                        'bg-emerald-500/20 text-emerald-400'
                                                }`}>
                                                {tx.riskScore}/100
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-xs px-2 py-1 rounded-full ${tx.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' :
                                                    tx.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                                                        'bg-yellow-500/20 text-yellow-400'
                                                }`}>
                                                {tx.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {suspiciousTx.data.length === 0 && (
                        <div className="p-12 text-center">
                            <AlertTriangle className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-2" />
                            <p className="text-[var(--text-secondary)]">No suspicious transactions found</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[var(--border)]">
                                    <th className="text-left px-6 py-4 text-xs font-medium text-[var(--text-muted)] uppercase">Date</th>
                                    <th className="text-left px-6 py-4 text-xs font-medium text-[var(--text-muted)] uppercase">User</th>
                                    <th className="text-left px-6 py-4 text-xs font-medium text-[var(--text-muted)] uppercase">Action</th>
                                    <th className="text-center px-6 py-4 text-xs font-medium text-[var(--text-muted)] uppercase">Severity</th>
                                </tr>
                            </thead>
                            <tbody>
                                {auditLogs.data.map((log: any) => (
                                    <tr key={log.id} className="border-b border-[var(--border)] hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                                            {new Date(log.createdAt).toLocaleString('ro-RO')}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            {log.user?.email || 'System'}
                                        </td>
                                        <td className="px-6 py-4 text-sm">{log.action}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${log.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                                                    log.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                                                        log.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                                                            'bg-blue-500/20 text-blue-400'
                                                }`}>
                                                {log.severity}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {auditLogs.data.length === 0 && (
                        <div className="p-12 text-center">
                            <FileSearch className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-2" />
                            <p className="text-[var(--text-secondary)]">No audit logs found</p>
                        </div>
                    )}
                </div>
            )}

            {/* Pagination */}
            {currentData.pagination?.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page <= 1}
                        className="p-2 rounded-lg bg-white/5 text-[var(--text-secondary)]
              hover:text-white disabled:opacity-30 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-[var(--text-secondary)]">
                        Page {page} of {currentData.pagination.totalPages}
                    </span>
                    <button
                        onClick={() => setPage(Math.min(currentData.pagination.totalPages, page + 1))}
                        disabled={page >= currentData.pagination.totalPages}
                        className="p-2 rounded-lg bg-white/5 text-[var(--text-secondary)]
              hover:text-white disabled:opacity-30 transition-colors"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
}
