import { apiFetch } from './client';

export interface Card {
  id: string;
  maskedPan: string;
  cardType: 'DEBIT' | 'VIRTUAL';
  status: 'ACTIVE' | 'BLOCKED';
  account: {
    id: string;
    iban: string;
    accountType: string;
    currency: string;
  };
}

export const getCards = (token: string) =>
  apiFetch<Card[]>('/cards', { token });

export const blockCard = (token: string, cardId: string) =>
  apiFetch<Card>(`/cards/${cardId}/block`, { method: 'PATCH', token });

export const unblockCard = (token: string, cardId: string) =>
  apiFetch<Card>(`/cards/${cardId}/unblock`, { method: 'PATCH', token });
