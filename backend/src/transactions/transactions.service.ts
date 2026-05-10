import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  private async profileId(userId: string): Promise<string> {
    const p = await this.prisma.customerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!p) throw new NotFoundException('Customer profile not found');
    return p.id;
  }

  async findByUser(userId: string) {
    const customerId = await this.profileId(userId);
    return this.prisma.transaction.findMany({
      where: { customerId },
      select: {
        id: true,
        type: true,
        status: true,
        amount: true,
        currency: true,
        fromAccountId: true,
        toAccountId: true,
        description: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneByUser(userId: string, txId: string) {
    const customerId = await this.profileId(userId);
    const txn = await this.prisma.transaction.findFirst({
      where: { id: txId, customerId },
      select: {
        id: true,
        type: true,
        status: true,
        amount: true,
        currency: true,
        fromAccountId: true,
        toAccountId: true,
        description: true,
        createdAt: true,
        ledgerEntries: {
          select: {
            id: true,
            accountId: true,
            side: true,
            amount: true,
            currency: true,
            createdAt: true,
          },
          orderBy: { sequence: 'asc' },
        },
      },
    });
    if (!txn) throw new NotFoundException('Transaction not found');
    return txn;
  }
}
