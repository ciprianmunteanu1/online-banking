import { useState, useEffect } from 'react';
import { cardsApi, accountsApi } from '../api/client';
import { CreditCard, Lock, Unlock, Plus, Wifi } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface Card {
    id: string;
    maskedNumber: string;
    expiryDate: string;
    status: 'ACTIVE' | 'BLOCKED_TEMPORARILY';
    accountId: string;
    account?: { iban: string; currency: string };
}

interface Account {
    id: string;
    iban: string;
    currency: string;
}

export default function CardsPage() {
    const [cards, setCards] = useState<Card[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            cardsApi.getAllCards().then((r) => setCards(r.data)),
            accountsApi.getAccounts().then((r) => setAccounts(r.data)),
        ]).finally(() => setLoading(false));
    }, []);

    const handleBlock = async (cardId: string) => {
        try {
            await cardsApi.blockCard(cardId);
            toast.success('Card blocked');
            setCards((prev) =>
                prev.map((c) => (c.id === cardId ? { ...c, status: 'BLOCKED_TEMPORARILY' } : c)),
            );
        } catch {
            toast.error('Failed to block card');
        }
    };

    const handleReactivate = async (cardId: string) => {
        try {
            await cardsApi.reactivateCard(cardId);
            toast.success('Card reactivated');
            setCards((prev) =>
                prev.map((c) => (c.id === cardId ? { ...c, status: 'ACTIVE' } : c)),
            );
        } catch {
            toast.error('Failed to reactivate card');
        }
    };

    const handleCreate = async (accountId: string) => {
        try {
            const { data } = await cardsApi.createCard(accountId);
            toast.success('Card created! Save your details.');
            // Show card details in an alert (only shown once)
            alert(
                `🎉 New Card Created!\n\nCard Number: ${data.cardNumber}\nExpiry: ${data.expiryDate}\nCVV: ${data.cvv}\n\n⚠️ Save these details — they won't be shown again!`,
            );
            cardsApi.getAllCards().then((r) => setCards(r.data));
        } catch {
            toast.error('Failed to create card');
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

            <div>
                <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
                    <CreditCard className="w-8 h-8 text-indigo-400" />
                    <span className="gradient-text">Your Cards</span>
                </h1>
                <p className="text-[var(--text-secondary)] mt-1">Manage your debit and credit cards</p>
            </div>

            {/* Create Card Section */}
            <div className="glass-card p-5">
                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Issue New Card</h3>
                <div className="flex flex-wrap gap-2">
                    {accounts.map((acc) => (
                        <button
                            key={acc.id}
                            onClick={() => handleCreate(acc.id)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm
                bg-white/5 border border-[var(--border)] text-[var(--text-secondary)]
                hover:text-white hover:border-indigo-500/30 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            {acc.iban.slice(-8)} ({acc.currency})
                        </button>
                    ))}
                </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger-children">
                {cards.map((card) => (
                    <div key={card.id} className="relative">
                        {/* Card Visual */}
                        <div
                            className={`rounded-2xl p-6 h-48 flex flex-col justify-between relative overflow-hidden
                ${card.status === 'ACTIVE'
                                    ? 'bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800'
                                    : 'bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800 opacity-70'
                                }
                shadow-xl transition-all duration-300 hover:scale-[1.02]`}
                        >
                            {/* Decorative circles */}
                            <div className="absolute top-4 right-4 w-24 h-24 rounded-full bg-white/10" />
                            <div className="absolute top-8 right-8 w-16 h-16 rounded-full bg-white/10" />

                            <div className="flex items-center justify-between relative z-10">
                                <Wifi className="w-8 h-8 text-white/60 rotate-90" />
                                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${card.status === 'ACTIVE'
                                        ? 'bg-green-400/20 text-green-300'
                                        : 'bg-red-400/20 text-red-300'
                                    }`}>
                                    {card.status === 'ACTIVE' ? 'Active' : 'Blocked'}
                                </span>
                            </div>

                            <div className="relative z-10">
                                <p className="text-xl font-mono tracking-widest text-white/90 mb-2">
                                    {card.maskedNumber}
                                </p>
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-white/60">
                                        Exp: {card.expiryDate}
                                    </p>
                                    <p className="text-sm text-white/60 font-mono">
                                        {card.account?.iban?.slice(-8)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-3">
                            {card.status === 'ACTIVE' ? (
                                <button
                                    onClick={() => handleBlock(card.id)}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                    text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20
                    hover:bg-red-500/20 transition-all"
                                >
                                    <Lock className="w-4 h-4" /> Block Temporarily
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleReactivate(card.id)}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                    text-sm font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20
                    hover:bg-emerald-500/20 transition-all"
                                >
                                    <Unlock className="w-4 h-4" /> Reactivate
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {cards.length === 0 && (
                    <div className="glass-card p-12 text-center col-span-2">
                        <CreditCard className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
                        <p className="text-[var(--text-secondary)]">No cards yet</p>
                        <p className="text-sm text-[var(--text-muted)]">Issue a new card from one of your accounts</p>
                    </div>
                )}
            </div>
        </div>
    );
}
