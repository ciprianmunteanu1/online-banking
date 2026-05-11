import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtAccessPayload } from '../auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not set');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      issuer: 'online-banking',
      audience: 'online-banking-api',
    });
  }

  async validate(payload: JwtAccessPayload): Promise<JwtAccessPayload> {
    if (payload.mfaVerified && payload.sessionId) {
      const session = await this.prisma.session.findUnique({
        where: { id: payload.sessionId },
        select: { userId: true, expiresAt: true, revokedAt: true },
      });

      if (
        !session ||
        session.userId !== payload.sub ||
        session.revokedAt ||
        session.expiresAt <= new Date()
      ) {
        throw new UnauthorizedException('Session is no longer active');
      }
    }

    return payload;
  }
}
