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

export interface AuditEvent {
  id: string;
  actorUserId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata?: unknown;
  createdAt: string;
}

export interface AuditEventsResponse {
  items: AuditEvent[];
  page: number;
  limit: number;
  total: number;
}

export interface AuditEventFilters {
  action?: string;
  resourceType?: string;
  actorUserId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export const getAuditEvents = (token: string, filters: AuditEventFilters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  const qs = params.toString();
  return apiFetch<AuditEventsResponse>(`/admin/audit-events${qs ? `?${qs}` : ''}`, { token });
};
