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

export interface TransferToBeneficiaryResponse {
  transactionId: string;
  status: string;
  sourceAccountId: string;
  beneficiaryId: string;
  beneficiaryIban: string;
  amount: string;
  currency: string;
  internalBeneficiary: boolean;
  ledgerBalanced: boolean;
}

export const transferToBeneficiary = (
  token: string,
  idempotencyKey: string,
  body: {
    sourceAccountId: string;
    beneficiaryId: string;
    amount: number;
    currency: string;
    description?: string;
  }
) => apiFetch<TransferToBeneficiaryResponse>('/payments/transfer-to-beneficiary', {
  method: 'POST',
  token,
  idempotencyKey,
  body,
});
