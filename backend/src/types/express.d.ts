import type { JwtAccessPayload } from '../auth/auth.types';

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtAccessPayload;
  }
}
