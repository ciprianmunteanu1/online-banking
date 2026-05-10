import {
    Controller,
    Get,
    Query,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { AuditService } from '../audit/audit.service';
import { TransactionsService } from '../transactions/transactions.service';
import { AuditSeverity } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
    constructor(
        private auditService: AuditService,
        private transactionsService: TransactionsService,
    ) { }

    @Get('audit-logs')
    async getAuditLogs(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('severity') severity?: AuditSeverity,
        @Query('userId') userId?: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return this.auditService.getAuditLogs(
            Number(page) || 1,
            Number(limit) || 50,
            {
                severity,
                userId,
                from: from ? new Date(from) : undefined,
                to: to ? new Date(to) : undefined,
            },
        );
    }

    @Get('suspicious-transactions')
    async getSuspiciousTransactions(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.transactionsService.getSuspiciousTransactions(
            Number(page) || 1,
            Number(limit) || 20,
        );
    }
}
