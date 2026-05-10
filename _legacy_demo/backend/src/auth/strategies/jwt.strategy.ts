import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    sessionId: string;
    mfaVerified?: boolean;
    stepUpVerifiedAt?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        configService: ConfigService,
        private prisma: PrismaService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET'),
        });
    }

    async validate(payload: JwtPayload) {
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        // Check session is still active
        if (payload.sessionId) {
            const session = await this.prisma.session.findUnique({
                where: { id: payload.sessionId },
            });

            if (!session || !session.isActive || session.expiresAt < new Date()) {
                throw new UnauthorizedException('Session expired or revoked');
            }
        }

        return {
            id: user.id,
            email: user.email,
            role: user.role,
            sessionId: payload.sessionId,
            mfaVerified: payload.mfaVerified,
            stepUpVerifiedAt: payload.stepUpVerifiedAt,
        };
    }
}
