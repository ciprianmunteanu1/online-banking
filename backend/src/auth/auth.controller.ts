import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtAccessPayload } from './auth.types';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { VerifyMfaDto } from './dto/verify-mfa.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('verify-mfa')
  @UseGuards(JwtAuthGuard)
  verifyMfa(@Req() req: Request, @Body() dto: VerifyMfaDto) {
    const user = req.user as JwtAccessPayload;
    return this.auth.verifyMfa(user, dto.otp);
  }
}
