import { apiFetch } from './client';

export interface TransferRequest {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  currency: string;
  description?: string;
}

export interface TransferResponse {
  transactionId: string;
  status: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: string;
  currency: string;
  ledgerBalanced: boolean;
}

export const transfer = (token: string, idempotencyKey: string, body: TransferRequest) =>
  apiFetch<TransferResponse>('/payments/transfer', {
    method: 'POST',
    token,
    idempotencyKey,
    body,
  });
