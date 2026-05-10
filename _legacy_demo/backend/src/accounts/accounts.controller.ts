import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    Req,
} from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
    constructor(private accountsService: AccountsService) { }

    @Get()
    async getAccounts(@Req() req: Request) {
        return this.accountsService.getUserAccounts((req.user as any).id);
    }

    @Get(':id')
    async getAccount(@Req() req: Request, @Param('id') id: string) {
        return this.accountsService.getAccountById((req.user as any).id, id);
    }

    @Post()
    async createAccount(
        @Req() req: Request,
        @Body() body: { currency: string; accountType: 'CURRENT' | 'SAVINGS' },
    ) {
        return this.accountsService.createAccount((req.user as any).id, body);
    }
}
