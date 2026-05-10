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

export interface IssueCardRequest {
  accountId: string;
  cardType: 'DEBIT' | 'VIRTUAL';
}

export const issueCard = (token: string, body: IssueCardRequest) =>
  apiFetch<Card>('/cards', { method: 'POST', token, body });

export const closeCard = (token: string, cardId: string) =>
  apiFetch<{ success: boolean }>(`/cards/${cardId}`, { method: 'DELETE', token });

export const initiateReveal = (token: string, cardId: string) =>
  apiFetch<{ challengeRequired: boolean; expiresInSeconds: number }>(`/cards/${cardId}/reveal/initiate`, { method: 'POST', token });

export const verifyReveal = (token: string, cardId: string, body: { otp: string }) =>
  apiFetch<{ cardNumber: string; expiry: string; cvv: string; revealExpiresInSeconds: number }>(`/cards/${cardId}/reveal/verify`, { method: 'POST', token, body });
