import { Controller, Get, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { StatementsService } from './statements.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MfaVerifiedGuard } from '../auth/guards/mfa-verified.guard';
import type { JwtAccessPayload } from '../auth/auth.types';

@Controller('statements')
@UseGuards(JwtAuthGuard, MfaVerifiedGuard)
export class StatementsController {
  constructor(private readonly statementsService: StatementsService) {}

  @Get()
  getStatement(
    @Req() req: Request,
    @Query('accountId') accountId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (!accountId) throw new BadRequestException('accountId is required');
    if (!from) throw new BadRequestException('from is required');
    if (!to) throw new BadRequestException('to is required');

    const user = req.user as JwtAccessPayload;
    return this.statementsService.getStatement(user.sub, accountId, from, to);
  }
}
