export type JwtAccessPayload = {
  sub: string;
  email: string;
  mfaVerified: boolean;
  sessionId?: string;
};
