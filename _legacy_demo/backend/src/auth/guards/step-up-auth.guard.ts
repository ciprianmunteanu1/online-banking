import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';

/**
 * Step-up authentication guard.
 * Requires that the user has recently re-verified their MFA
 * (within the last 5 minutes) for sensitive operations.
 */
@Injectable()
export class StepUpAuthGuard implements CanActivate {
    private readonly STEP_UP_VALIDITY_MS = 5 * 60 * 1000; // 5 minutes

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            throw new ForbiddenException('Authentication required');
        }

        // If user has MFA enabled, require step-up verification
        if (user.mfaVerified === false) {
            throw new ForbiddenException({
                statusCode: 403,
                message: 'MFA verification required',
                error: 'STEP_UP_REQUIRED',
            });
        }

        // Check if step-up was done within validity window
        if (user.stepUpVerifiedAt) {
            const elapsed = Date.now() - user.stepUpVerifiedAt;
            if (elapsed > this.STEP_UP_VALIDITY_MS) {
                throw new ForbiddenException({
                    statusCode: 403,
                    message: 'Step-up authentication expired. Please re-verify.',
                    error: 'STEP_UP_REQUIRED',
                });
            }
            return true;
        }

        // If MFA is not enabled for this user, allow the operation
        return true;
    }
}
