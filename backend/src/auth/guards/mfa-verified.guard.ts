import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import type { JwtAccessPayload } from '../auth.types';

@Injectable()
export class MfaVerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as JwtAccessPayload | undefined;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }
    if (!user.mfaVerified) {
      throw new ForbiddenException(
        'MFA verification is required before this action.',
      );
    }
    return true;
  }
}
