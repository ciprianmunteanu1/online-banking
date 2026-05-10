import { Controller, Get, Post, Patch, Delete, Param, Body, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { CardsService } from './cards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MfaVerifiedGuard } from '../auth/guards/mfa-verified.guard';
import type { JwtAccessPayload } from '../auth/auth.types';
import { IssueCardDto } from './dto/issue-card.dto';
import { VerifyRevealDto } from './dto/verify-reveal.dto';

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

  @Post()
  issueCard(@Req() req: Request, @Body() dto: IssueCardDto) {
    const user = req.user as JwtAccessPayload;
    return this.cardsService.issueCard(user.sub, dto);
  }

  @Delete(':id')
  closeCard(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as JwtAccessPayload;
    return this.cardsService.closeCard(user.sub, id);
  }

  @Post(':id/reveal/initiate')
  initiateReveal(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as JwtAccessPayload;
    return this.cardsService.initiateReveal(user.sub, id);
  }

  @Post(':id/reveal/verify')
  verifyReveal(@Req() req: Request, @Param('id') id: string, @Body() dto: VerifyRevealDto) {
    const user = req.user as JwtAccessPayload;
    return this.cardsService.verifyReveal(user.sub, id, dto);
  }
}
