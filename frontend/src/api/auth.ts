import { apiFetch } from './client';

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  mfaRequired: boolean;
  expiresInSeconds: number;
}

export interface VerifyMfaResponse {
  accessToken: string;
  tokenType: string;
  sessionConfirmed: boolean;
}

export const login = (email: string, password: string) =>
  apiFetch<LoginResponse>('/auth/login', { method: 'POST', body: { email, password } });

export const verifyMfa = (preMfaToken: string, otp: string) =>
  apiFetch<VerifyMfaResponse>('/auth/verify-mfa', {
    method: 'POST',
    token: preMfaToken,
    body: { otp },
  });

export interface RegisterResponse {
  message: string;
}

export const register = (body: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) => apiFetch<RegisterResponse>('/auth/register', { method: 'POST', body });

export interface UserMe {
  userId: string;
  email: string;
  roles: string[];
  customerProfileId?: string;
  fullLegalName?: string;
  kycStatus?: string;
  verifiedAt?: string | null;
}

export const getMe = (token: string) =>
  apiFetch<UserMe>('/auth/me', { token });

export interface SessionInfo {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  isCurrent?: boolean;
  isActive?: boolean;
}

export const getSessions = (token: string) =>
  apiFetch<SessionInfo[]>('/auth/sessions', { token });

export const revokeSession = (token: string, id: string) =>
  apiFetch<SessionInfo>(`/auth/sessions/${id}`, { method: 'DELETE', token });
