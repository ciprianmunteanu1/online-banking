import { apiFetch } from './client';

export interface Merchant {
  id: string;
  name: string;
  merchantCode: string;
  category: string;
}

export interface MerchantPaymentRequest {
  sourceAccountId: string;
  merchantId: string;
  amount: number;
  currency: string;
  description?: string;
}

export interface MerchantPaymentResponse {
  transactionId: string;
  status: string;
  sourceAccountId: string;
  merchantId: string;
  amount: string;
  currency: string;
  ledgerBalanced: boolean;
}

export const getMerchants = (token: string) =>
  apiFetch<Merchant[]>('/merchants', { token });

export const payMerchant = (
  token: string,
  idempotencyKey: string,
  body: MerchantPaymentRequest,
) =>
  apiFetch<MerchantPaymentResponse>('/payments/pay-merchant', {
    method: 'POST',
    token,
    idempotencyKey,
    body,
  });
