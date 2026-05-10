import { apiFetch } from './client';

export interface Account {
  id: string;
  iban: string;
  currency: string;
  availableBalance: string; // Prisma Decimal → serialised as string
  accountType: string;
  status: string;
  openedAt: string;
}

export const getAccounts = (token: string) =>
  apiFetch<Account[]>('/accounts', { token });
