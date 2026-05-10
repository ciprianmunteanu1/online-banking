import { apiFetch } from './client';

export interface StatementEntry {
  ledgerEntryId: string;
  transactionId: string;
  transactionType: string;
  transactionStatus: string;
  side: 'DEBIT' | 'CREDIT';
  amount: string;
  currency: string;
  description: string;
  createdAt: string;
}

export interface StatementResponse {
  account: {
    id: string;
    iban: string;
    accountType: string;
    currency: string;
  };
  period: {
    from: string;
    to: string;
  };
  openingBalance: string;
  closingBalance: string;
  totalDebits: string;
  totalCredits: string;
  entries: StatementEntry[];
}

export const getStatement = (token: string, params: { accountId: string; from: string; to: string }) => {
  const query = new URLSearchParams({
    accountId: params.accountId,
    from: params.from,
    to: params.to,
  }).toString();
  return apiFetch<StatementResponse>(`/statements?${query}`, { token });
};
