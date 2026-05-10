import {
    Controller,
    Post,
    Get,
    Body,
    UseGuards,
    Req,
    Param,
    Delete,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, VerifyMfaDto, EnableMfaDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('register')
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @UseGuards(LocalAuthGuard)
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() dto: LoginDto, @Req() req: Request) {
        const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;
        return this.authService.login(req.user, dto, ipAddress);
    }

    // ─── MFA ────────────────────────────────────────────────────────

    @UseGuards(JwtAuthGuard)
    @Post('mfa/setup')
    async setupMfa(@Req() req: Request) {
        return this.authService.setupMfa((req.user as any).id);
    }

    @UseGuards(JwtAuthGuard)
    @Post('mfa/enable')
    async enableMfa(@Body() dto: EnableMfaDto, @Req() req: Request) {
        return this.authService.enableMfa((req.user as any).id, dto.code);
    }

    @UseGuards(JwtAuthGuard)
    @Post('mfa/disable')
    async disableMfa(@Body() dto: VerifyMfaDto, @Req() req: Request) {
        return this.authService.disableMfa((req.user as any).id, dto.code);
    }

    @UseGuards(JwtAuthGuard)
    @Post('mfa/verify-step-up')
    async verifyStepUp(@Body() dto: VerifyMfaDto, @Req() req: Request) {
        return this.authService.verifyStepUp((req.user as any).id, dto.code);
    }

    // ─── MFA Login (second step) ──────────────────────────────────

    @Post('mfa/login')
    @HttpCode(HttpStatus.OK)
    async mfaLogin(@Body() body: { tempToken: string; mfaCode: string; deviceInfo?: string }, @Req() req: Request) {
        // Verify temp token
        let payload: any;
        try {
            payload = (this.authService as any).jwtService.verify(body.tempToken);
        } catch {
            return { error: 'Invalid or expired MFA token' };
        }

        if (payload.type !== 'mfa-pending') {
            return { error: 'Invalid token type' };
        }

        const user = await (this.authService as any).prisma.user.findUnique({
            where: { id: payload.sub },
        });

        if (!user) {
            return { error: 'User not found' };
        }

        const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;
        return this.authService.login(
            {
                id: user.id,
                email: user.email,
                role: user.role,
                mfaEnabled: user.mfaEnabled,
                firstName: user.firstName,
                lastName: user.lastName,
            },
            { email: user.email, password: '', mfaCode: body.mfaCode, deviceInfo: body.deviceInfo },
            ipAddress,
        );
    }

    // ─── Google OAuth ─────────────────────────────────────────────

    @Get('google')
    @UseGuards(GoogleAuthGuard)
    async googleAuth() {
        // Initiates the Google OAuth flow — handled by Passport
    }

    @Get('google/callback')
    @UseGuards(GoogleAuthGuard)
    async googleCallback(@Req() req: Request) {
        const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;
        return this.authService.googleLogin(req.user, ipAddress);
    }

    // ─── Profile ──────────────────────────────────────────────────

    @UseGuards(JwtAuthGuard)
    @Get('profile')
    async getProfile(@Req() req: Request) {
        return this.authService.getProfile((req.user as any).id);
    }

    // ─── Sessions ─────────────────────────────────────────────────

    @UseGuards(JwtAuthGuard)
    @Get('sessions')
    async getSessions(@Req() req: Request) {
        return this.authService.getSessions((req.user as any).id);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('sessions/:sessionId')
    async revokeSession(
        @Req() req: Request,
        @Param('sessionId') sessionId: string,
    ) {
        return this.authService.revokeSession((req.user as any).id, sessionId);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('sessions')
    async revokeAllSessions(@Req() req: Request) {
        return this.authService.revokeAllSessions(
            (req.user as any).id,
            (req.user as any).sessionId,
        );
    }

    // ─── Refresh Token ────────────────────────────────────────────

    @UseGuards(JwtAuthGuard)
    @Post('refresh')
    async refreshToken(@Req() req: Request) {
        return this.authService.refreshToken(
            (req.user as any).id,
            (req.user as any).sessionId,
        );
    }
}
