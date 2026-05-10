import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatementsService {
    constructor(private prisma: PrismaService) { }

    async getStatement(
        userId: string,
        accountId: string,
        from: Date,
        to: Date,
    ) {
        // Verify account belongs to user
        const account = await this.prisma.account.findFirst({
            where: { id: accountId, userId },
        });

        if (!account) {
            throw new NotFoundException('Account not found');
        }

        const entries = await this.prisma.ledgerEntry.findMany({
            where: {
                accountId,
                createdAt: {
                    gte: from,
                    lte: to,
                },
            },
            include: {
                transaction: {
                    select: {
                        referenceId: true,
                        description: true,
                        status: true,
                        currency: true,
                        createdAt: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Calculate totals
        let totalDebits = 0;
        let totalCredits = 0;

        entries.forEach((entry) => {
            const amount = Number(entry.amount);
            if (entry.type === 'DEBIT') totalDebits += amount;
            else totalCredits += amount;
        });

        return {
            account: {
                id: account.id,
                iban: account.iban,
                currency: account.currency,
                currentBalance: Number(account.balance),
            },
            period: { from, to },
            entries: entries.map((e) => ({
                id: e.id,
                type: e.type,
                amount: Number(e.amount),
                referenceId: e.transaction.referenceId,
                description: e.transaction.description,
                status: e.transaction.status,
                date: e.createdAt,
            })),
            summary: {
                totalDebits,
                totalCredits,
                netChange: totalCredits - totalDebits,
                transactionCount: entries.length,
            },
        };
    }
}
