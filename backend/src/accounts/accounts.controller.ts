import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtAccessPayload } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MfaVerifiedGuard } from '../auth/guards/mfa-verified.guard';
import { AccountsService } from './accounts.service';

@Controller('accounts')
@UseGuards(JwtAuthGuard, MfaVerifiedGuard)
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  findAll(@Req() req: Request) {
    const user = req.user as JwtAccessPayload;
    return this.accounts.findByUser(user.sub);
  }
}
