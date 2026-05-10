import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes, randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import type { JwtAccessPayload } from './auth.types';
import type { LoginDto } from './dto/login.dto';

const MFA_OTP_TTL_SECONDS = 300;
const MFA_REDIS_PREFIX = 'mfa:otp:';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const otp = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const redisKey = `${MFA_REDIS_PREFIX}${user.id}`;
    await this.redis.redis.setex(redisKey, MFA_OTP_TTL_SECONDS, otp);
    console.log(`[MFA mock] OTP for ${user.email}: ${otp}`);

    const preMfaExpires =
      this.config.get<string>('JWT_PRE_MFA_EXPIRES_IN') ?? '10m';
    const accessToken = await this.jwt.signAsync(
      {
        sub: user.id,
        email: user.email,
        mfaVerified: false,
      } satisfies JwtAccessPayload,
      { expiresIn: preMfaExpires },
    );

    return {
      accessToken,
      tokenType: 'Bearer',
      mfaRequired: true,
      expiresInSeconds: MFA_OTP_TTL_SECONDS,
    };
  }

  async verifyMfa(userPayload: JwtAccessPayload, otp: string) {
    if (userPayload.mfaVerified) {
      throw new BadRequestException('MFA already completed for this token');
    }
    const redisKey = `${MFA_REDIS_PREFIX}${userPayload.sub}`;
    const stored = await this.redis.redis.get(redisKey);
    if (!stored || stored !== otp) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }
    await this.redis.redis.del(redisKey);

    const user = await this.prisma.user.findUnique({
      where: { id: userPayload.sub },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User no longer valid');
    }

    const refreshSecret = randomBytes(32).toString('hex');
    const refreshTokenHash = await bcrypt.hash(refreshSecret, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        expiresAt,
      },
    });

    const accessExpires =
      this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';
    const accessToken = await this.jwt.signAsync(
      {
        sub: user.id,
        email: user.email,
        mfaVerified: true,
      } satisfies JwtAccessPayload,
      { expiresIn: accessExpires },
    );

    return {
      accessToken,
      tokenType: 'Bearer',
      sessionConfirmed: true,
    };
  }
}
