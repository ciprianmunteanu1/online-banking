import { apiFetch } from './client';

export interface Beneficiary {
  id: string;
  displayName: string;
  alias: string | null;
  iban: string;
  createdAt: string;
}

export interface CreateBeneficiaryRequest {
  name: string;
  iban: string;
  alias?: string;
}

export const getBeneficiaries = (token: string) =>
  apiFetch<Beneficiary[]>('/beneficiaries', { token });

export const createBeneficiary = (token: string, body: CreateBeneficiaryRequest) =>
  apiFetch<Beneficiary>('/beneficiaries', { method: 'POST', token, body });

// DELETE returns 204 No Content → body is null, void is fine
export const deleteBeneficiary = (token: string, id: string) =>
  apiFetch<void>(`/beneficiaries/${id}`, { method: 'DELETE', token });
