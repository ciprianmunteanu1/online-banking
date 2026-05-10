import {
    Controller,
    Post,
    Get,
    Body,
    Query,
    Param,
    UseGuards,
    Req,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransferDto, MerchantPaymentDto } from './dto/create-transfer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StepUpAuthGuard } from '../auth/guards/step-up-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
    constructor(
        private transactionsService: TransactionsService,
        private configService: ConfigService,
    ) { }

    @Post('transfer')
    async createTransfer(
        @Body() dto: CreateTransferDto,
        @Req() req: Request,
    ) {
        const user = req.user as any;
        const threshold = Number(
            this.configService.get('STEP_UP_THRESHOLD_AMOUNT', '5000'),
        );

        // Check if step-up is required for high-value transfers
        if (dto.amount >= threshold && user.mfaVerified !== true) {
            return {
                statusCode: 403,
                error: 'STEP_UP_REQUIRED',
                message: `Transfers of ${threshold}+ require step-up authentication`,
                threshold,
            };
        }

        return this.transactionsService.createTransfer(user.id, dto);
    }

    @Post('merchant-payment')
    async createMerchantPayment(
        @Body() dto: MerchantPaymentDto,
        @Req() req: Request,
    ) {
        return this.transactionsService.createMerchantPayment(
            (req.user as any).id,
            dto,
        );
    }

    @Get()
    async getUserTransactions(
        @Req() req: Request,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.transactionsService.getUserTransactions(
            (req.user as any).id,
            Number(page) || 1,
            Number(limit) || 20,
        );
    }

    @Get(':id')
    async getTransaction(@Param('id') id: string) {
        return this.transactionsService.getTransactionById(id);
    }
}
