import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { StatementsService } from './statements.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('statements')
@UseGuards(JwtAuthGuard)
export class StatementsController {
    constructor(private statementsService: StatementsService) { }

    @Get()
    async getStatement(
        @Req() req: Request,
        @Query('accountId') accountId: string,
        @Query('from') from: string,
        @Query('to') to: string,
    ) {
        return this.statementsService.getStatement(
            (req.user as any).id,
            accountId,
            new Date(from),
            new Date(to),
        );
    }
}
