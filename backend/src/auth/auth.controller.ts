import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { JwtAccessPayload } from './auth.types';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyMfaDto } from './dto/verify-mfa.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { MfaVerifiedGuard } from './guards/mfa-verified.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('verify-mfa')
  @UseGuards(JwtAuthGuard)
  verifyMfa(@Req() req: Request, @Body() dto: VerifyMfaDto) {
    const user = req.user as JwtAccessPayload;
    return this.auth.verifyMfa(user, dto.otp, {
      userAgent: req.get('user-agent') ?? null,
      ipAddress: req.ip ?? null,
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, MfaVerifiedGuard)
  getMe(@Req() req: Request) {
    const user = req.user as JwtAccessPayload;
    return this.auth.getMe(user.sub);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard, MfaVerifiedGuard)
  getSessions(@Req() req: Request) {
    const user = req.user as JwtAccessPayload;
    return this.auth.getSessions(user.sub, user.sessionId);
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard, MfaVerifiedGuard)
  revokeSession(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) sessionId: string,
  ) {
    const user = req.user as JwtAccessPayload;
    return this.auth.revokeSession(user.sub, sessionId, {
      userAgent: req.get('user-agent') ?? null,
      ipAddress: req.ip ?? null,
    });
  }
}
