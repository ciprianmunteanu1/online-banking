import {
    Injectable,
    ConflictException,
    UnauthorizedException,
    BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    // ─── Registration ──────────────────────────────────────────────

    async register(dto: RegisterDto) {
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase() },
        });

        if (existing) {
            throw new ConflictException('Email already registered');
        }

        const passwordHash = await bcrypt.hash(dto.password, 12);

        const user = await this.prisma.user.create({
            data: {
                email: dto.email.toLowerCase(),
                passwordHash,
                firstName: dto.firstName,
                lastName: dto.lastName,
            },
        });

        // Create a default current account with a random IBAN
        await this.prisma.account.create({
            data: {
                userId: user.id,
                iban: this.generateIBAN(),
                currency: 'RON',
                balance: 0,
                accountType: 'CURRENT',
            },
        });

        return {
            message: 'Registration successful',
            userId: user.id,
        };
    }

    // ─── Validate User (Local Strategy) ───────────────────────────

    async validateUser(email: string, password: string) {
        const user = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (!user || !user.passwordHash) {
            return null;
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return null;
        }

        return {
            id: user.id,
            email: user.email,
            role: user.role,
            mfaEnabled: user.mfaEnabled,
            firstName: user.firstName,
            lastName: user.lastName,
        };
    }

    // ─── Login ─────────────────────────────────────────────────────

    async login(
        user: any,
        loginDto: LoginDto,
        ipAddress?: string,
    ) {
        // Check if user has MFA enabled
        if (user.mfaEnabled) {
            // Check for trusted session (Remember Device)
            const trustedSession = await this.prisma.session.findFirst({
                where: {
                    userId: user.id,
                    isActive: true,
                    trustedUntil: { gte: new Date() },
                    deviceInfo: loginDto.deviceInfo || null,
                },
            });

            if (trustedSession) {
                // Trusted device — skip MFA
                return this.createLoginResponse(user, loginDto.deviceInfo, ipAddress, true);
            }

            // MFA required
            if (!loginDto.mfaCode) {
                return {
                    requiresMfa: true,
                    message: 'MFA code required',
                    tempToken: this.jwtService.sign(
                        { sub: user.id, type: 'mfa-pending' },
                        { expiresIn: 300 },
                    ),
                };
            }

            // Verify MFA code
            const fullUser = await this.prisma.user.findUnique({
                where: { id: user.id },
            });

            const isValid = speakeasy.totp.verify({
                secret: fullUser.mfaSecret,
                encoding: 'base32',
                token: loginDto.mfaCode,
                window: 1,
            });

            if (!isValid) {
                throw new UnauthorizedException('Invalid MFA code');
            }
        }

        return this.createLoginResponse(user, loginDto.deviceInfo, ipAddress, true);
    }

    // ─── MFA Setup ────────────────────────────────────────────────

    async setupMfa(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (user.mfaEnabled) {
            throw new BadRequestException('MFA is already enabled');
        }

        const secret = speakeasy.generateSecret({
            name: `OnlineBanking:${user.email}`,
            issuer: 'OnlineBanking',
        });

        // Store the secret temporarily (not enabled yet until verified)
        await this.prisma.user.update({
            where: { id: userId },
            data: { mfaSecret: secret.base32 },
        });

        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        return {
            secret: secret.base32,
            qrCode: qrCodeUrl,
        };
    }

    async enableMfa(userId: string, code: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user.mfaSecret) {
            throw new BadRequestException('Please setup MFA first');
        }

        const isValid = speakeasy.totp.verify({
            secret: user.mfaSecret,
            encoding: 'base32',
            token: code,
            window: 1,
        });

        if (!isValid) {
            throw new UnauthorizedException('Invalid MFA code');
        }

        await this.prisma.user.update({
            where: { id: userId },
            data: { mfaEnabled: true },
        });

        return { message: 'MFA enabled successfully' };
    }

    async disableMfa(userId: string, code: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user.mfaEnabled) {
            throw new BadRequestException('MFA is not enabled');
        }

        const isValid = speakeasy.totp.verify({
            secret: user.mfaSecret,
            encoding: 'base32',
            token: code,
            window: 1,
        });

        if (!isValid) {
            throw new UnauthorizedException('Invalid MFA code');
        }

        await this.prisma.user.update({
            where: { id: userId },
            data: { mfaEnabled: false, mfaSecret: null },
        });

        return { message: 'MFA disabled successfully' };
    }

    // ─── Step-up Authentication ───────────────────────────────────

    async verifyStepUp(userId: string, code: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user.mfaEnabled || !user.mfaSecret) {
            throw new BadRequestException('MFA is not enabled');
        }

        const isValid = speakeasy.totp.verify({
            secret: user.mfaSecret,
            encoding: 'base32',
            token: code,
            window: 1,
        });

        if (!isValid) {
            throw new UnauthorizedException('Invalid MFA code');
        }

        // Issue a new token with stepUpVerifiedAt
        const session = await this.prisma.session.findFirst({
            where: { userId: user.id, isActive: true },
            orderBy: { createdAt: 'desc' },
        });

        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            sessionId: session?.id,
            mfaVerified: true,
            stepUpVerifiedAt: Date.now(),
        };

        return {
            accessToken: this.jwtService.sign(payload),
            message: 'Step-up verification successful',
        };
    }

    // ─── Google OAuth ─────────────────────────────────────────────

    async findOrCreateGoogleUser(googleData: {
        googleId: string;
        email: string;
        firstName: string;
        lastName: string;
    }) {
        let user = await this.prisma.user.findUnique({
            where: { googleId: googleData.googleId },
        });

        if (!user) {
            // Check if email exists
            user = await this.prisma.user.findUnique({
                where: { email: googleData.email.toLowerCase() },
            });

            if (user) {
                // Link Google account to existing user
                user = await this.prisma.user.update({
                    where: { id: user.id },
                    data: { googleId: googleData.googleId },
                });
            } else {
                // Create new user
                user = await this.prisma.user.create({
                    data: {
                        email: googleData.email.toLowerCase(),
                        googleId: googleData.googleId,
                        firstName: googleData.firstName,
                        lastName: googleData.lastName,
                    },
                });

                // Create default account
                await this.prisma.account.create({
                    data: {
                        userId: user.id,
                        iban: this.generateIBAN(),
                        currency: 'RON',
                        balance: 0,
                        accountType: 'CURRENT',
                    },
                });
            }
        }

        return user;
    }

    async googleLogin(user: any, ipAddress?: string) {
        return this.createLoginResponse(
            {
                id: user.id,
                email: user.email,
                role: user.role,
                mfaEnabled: user.mfaEnabled,
                firstName: user.firstName,
                lastName: user.lastName,
            },
            'Google OAuth',
            ipAddress,
            false,
        );
    }

    // ─── Sessions ─────────────────────────────────────────────────

    async getSessions(userId: string) {
        return this.prisma.session.findMany({
            where: { userId, isActive: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async revokeSession(userId: string, sessionId: string) {
        const session = await this.prisma.session.findUnique({
            where: { id: sessionId },
        });

        if (!session || session.userId !== userId) {
            throw new UnauthorizedException('Session not found');
        }

        await this.prisma.session.update({
            where: { id: sessionId },
            data: { isActive: false },
        });

        return { message: 'Session revoked' };
    }

    async revokeAllSessions(userId: string, currentSessionId?: string) {
        await this.prisma.session.updateMany({
            where: {
                userId,
                isActive: true,
                ...(currentSessionId ? { NOT: { id: currentSessionId } } : {}),
            },
            data: { isActive: false },
        });

        return { message: 'All sessions revoked' };
    }

    // ─── Get Profile ──────────────────────────────────────────────

    async getProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                role: true,
                firstName: true,
                lastName: true,
                mfaEnabled: true,
                createdAt: true,
            },
        });

        return user;
    }

    // ─── Refresh Token ────────────────────────────────────────────

    async refreshToken(userId: string, sessionId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        const session = await this.prisma.session.findUnique({
            where: { id: sessionId },
        });

        if (!session || !session.isActive) {
            throw new UnauthorizedException('Invalid session');
        }

        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            sessionId: session.id,
            mfaVerified: user.mfaEnabled,
        };

        return {
            accessToken: this.jwtService.sign(payload),
            refreshToken: this.jwtService.sign(
                { sub: user.id, sessionId: session.id, type: 'refresh' },
                {
                    secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
                    expiresIn: 604800, // 7 days in seconds
                },
            ),
        };
    }

    // ─── Private Helpers ──────────────────────────────────────────

    private async createLoginResponse(
        user: any,
        deviceInfo?: string,
        ipAddress?: string,
        mfaVerified = false,
    ) {
        // Create session
        const session = await this.prisma.session.create({
            data: {
                userId: user.id,
                deviceInfo: deviceInfo || 'Unknown',
                ipAddress: ipAddress || 'Unknown',
                isActive: true,
                trustedUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            },
        });

        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            sessionId: session.id,
            mfaVerified: mfaVerified || !user.mfaEnabled,
        };

        const accessToken = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(
            { sub: user.id, sessionId: session.id, type: 'refresh' },
            {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
                expiresIn: 604800, // 7 days in seconds
            },
        );

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
                mfaEnabled: user.mfaEnabled,
            },
        };
    }

    private generateIBAN(): string {
        const countryCode = 'RO';
        const bankCode = 'OBKR';
        const accountNumber = Array.from({ length: 16 }, () =>
            Math.floor(Math.random() * 10),
        ).join('');
        const checkDigits = String(Math.floor(Math.random() * 90) + 10);
        return `${countryCode}${checkDigits}${bankCode}${accountNumber}`;
    }
}
