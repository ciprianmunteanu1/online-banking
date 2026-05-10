import { Controller, Get, Patch, Param, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { CardsService } from './cards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MfaVerifiedGuard } from '../auth/guards/mfa-verified.guard';
import type { JwtAccessPayload } from '../auth/auth.types';

@Controller('cards')
@UseGuards(JwtAuthGuard, MfaVerifiedGuard)
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Get()
  getCards(@Req() req: Request) {
    const user = req.user as JwtAccessPayload;
    return this.cardsService.getCards(user.sub);
  }

  @Patch(':id/block')
  blockCard(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as JwtAccessPayload;
    return this.cardsService.blockCard(user.sub, id);
  }

  @Patch(':id/unblock')
  unblockCard(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as JwtAccessPayload;
    return this.cardsService.unblockCard(user.sub, id);
  }
}
