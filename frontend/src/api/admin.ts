import { apiFetch } from './client';

export interface AdminAccount {
  id: string;
  iban: string;
  accountType: string;
  status: string;
  availableBalance: string;
  currency: string;
}

export interface AdminCustomer {
  id: string;
  user: { id: string; email: string };
  fullLegalName: string;
  kycStatus: string;
  verifiedAt: string | null;
  createdAt: string;
  accounts: AdminAccount[];
}

export const getAdminCustomers = (token: string) =>
  apiFetch<AdminCustomer[]>('/admin/customers', { token });

export const verifyCustomer = (token: string, customerId: string) =>
  apiFetch<void>(`/admin/customers/${customerId}/verify`, { method: 'PATCH', token });

export const rejectCustomer = (token: string, customerId: string) =>
  apiFetch<void>(`/admin/customers/${customerId}/reject`, { method: 'PATCH', token });

export const creditAccount = (
  token: string,
  accountId: string,
  body: { amount: number; currency: string; description?: string },
) => apiFetch<{ transactionId: string }>(`/admin/accounts/${accountId}/credit`, { method: 'POST', token, body });
