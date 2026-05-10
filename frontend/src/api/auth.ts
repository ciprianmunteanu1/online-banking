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
