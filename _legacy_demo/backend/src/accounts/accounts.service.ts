import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccountsService {
    constructor(private prisma: PrismaService) { }

    async getUserAccounts(userId: string) {
        return this.prisma.account.findMany({
            where: { userId },
            select: {
                id: true,
                iban: true,
                currency: true,
                balance: true,
                accountType: true,
                status: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
        });
    }

    async getAccountById(userId: string, accountId: string) {
        const account = await this.prisma.account.findFirst({
            where: { id: accountId, userId },
        });

        if (!account) {
            throw new NotFoundException('Account not found');
        }

        return account;
    }

    async createAccount(
        userId: string,
        data: { currency: string; accountType: 'CURRENT' | 'SAVINGS' },
    ) {
        const iban = this.generateIBAN();

        return this.prisma.account.create({
            data: {
                userId,
                iban,
                currency: data.currency,
                accountType: data.accountType,
                balance: 0,
            },
        });
    }

    private generateIBAN(): string {
        const countryCode = 'RO';
        const bankCode = 'OBKR';
        const accountNumber = Array.from({ length: 16 }, () =>
            Math.floor(Math.random() * 10),
        ).join('');
        const checkDigits = String(Math.floor(Math.random() * 90) + 10);
        return `${countryCode}${checkDigits}${bankCode}${accountNumber}`;
    }
}
