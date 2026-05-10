import { apiFetch } from './client';

export interface TxnSummary {
  id: string;
  type: string;
  status: string;
  amount: string;
  currency: string;
  fromAccountId: string | null;
  toAccountId: string | null;
  description: string | null;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  accountId: string;
  side: string;
  amount: string;
  currency: string;
  createdAt: string;
}

export interface TxnDetail extends TxnSummary {
  ledgerEntries: LedgerEntry[];
}

export const getTransactions = (token: string) =>
  apiFetch<TxnSummary[]>('/transactions', { token });

export const getTransaction = (token: string, id: string) =>
  apiFetch<TxnDetail>(`/transactions/${id}`, { token });
