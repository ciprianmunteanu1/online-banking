import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatementsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatement(userId: string, accountId: string, from: string, to: string) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Customer profile not found');

    const account = await this.prisma.account.findFirst({
      where: { id: accountId, customerId: profile.id, isSystem: false },
    });
    if (!account) throw new NotFoundException('Account not found or access denied');

    const fromDate = new Date(from);
    const toDate = new Date(to);
    
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    if (fromDate > toDate) {
      throw new BadRequestException('from date must be before or equal to to date');
    }

    // End of the "to" day
    toDate.setUTCHours(23, 59, 59, 999);

    // Compute opening balance
    const [prevCredits, prevDebits] = await Promise.all([
      this.prisma.ledgerEntry.aggregate({
        where: { accountId, side: 'CREDIT', createdAt: { lt: fromDate } },
        _sum: { amount: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: { accountId, side: 'DEBIT', createdAt: { lt: fromDate } },
        _sum: { amount: true },
      }),
    ]);

    const opCredit = Number(prevCredits._sum.amount || 0);
    const opDebit = Number(prevDebits._sum.amount || 0);
    const openingBalance = opCredit - opDebit;

    // Compute period totals
    const [periodCredits, periodDebits] = await Promise.all([
      this.prisma.ledgerEntry.aggregate({
        where: { accountId, side: 'CREDIT', createdAt: { gte: fromDate, lte: toDate } },
        _sum: { amount: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: { accountId, side: 'DEBIT', createdAt: { gte: fromDate, lte: toDate } },
        _sum: { amount: true },
      }),
    ]);

    const totCredit = Number(periodCredits._sum.amount || 0);
    const totDebit = Number(periodDebits._sum.amount || 0);
    const closingBalance = openingBalance + totCredit - totDebit;

    // Fetch entries
    const rawEntries = await this.prisma.ledgerEntry.findMany({
      where: { accountId, createdAt: { gte: fromDate, lte: toDate } },
      include: { transaction: true },
      orderBy: { createdAt: 'desc' },
    });

    const entries = rawEntries.map(e => ({
      ledgerEntryId: e.id,
      transactionId: e.transaction.id,
      transactionType: e.transaction.type,
      transactionStatus: e.transaction.status,
      side: e.side,
      amount: e.amount.toString(),
      currency: e.currency,
      description: e.transaction.description,
      createdAt: e.createdAt.toISOString(),
    }));

    return {
      account: {
        id: account.id,
        iban: account.iban,
        accountType: account.accountType,
        currency: account.currency,
      },
      period: {
        from,
        to,
      },
      openingBalance: openingBalance.toFixed(4),
      closingBalance: closingBalance.toFixed(4),
      totalDebits: totDebit.toFixed(4),
      totalCredits: totCredit.toFixed(4),
      entries,
    };
  }
}
