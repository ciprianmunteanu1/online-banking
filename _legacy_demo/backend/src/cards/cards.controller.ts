import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    UseGuards,
    Req,
} from '@nestjs/common';
import { CardsService } from './cards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('cards')
@UseGuards(JwtAuthGuard)
export class CardsController {
    constructor(private cardsService: CardsService) { }

    @Get()
    async getAllCards(@Req() req: Request) {
        return this.cardsService.getAllUserCards((req.user as any).id);
    }

    @Get('account/:accountId')
    async getCardsByAccount(
        @Req() req: Request,
        @Param('accountId') accountId: string,
    ) {
        return this.cardsService.getCardsByAccount(
            (req.user as any).id,
            accountId,
        );
    }

    @Post('account/:accountId')
    async createCard(
        @Req() req: Request,
        @Param('accountId') accountId: string,
    ) {
        return this.cardsService.createCard((req.user as any).id, accountId);
    }

    @Patch(':cardId/block')
    async blockCard(@Req() req: Request, @Param('cardId') cardId: string) {
        return this.cardsService.blockCard((req.user as any).id, cardId);
    }

    @Patch(':cardId/reactivate')
    async reactivateCard(
        @Req() req: Request,
        @Param('cardId') cardId: string,
    ) {
        return this.cardsService.reactivateCard((req.user as any).id, cardId);
    }
}
