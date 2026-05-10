import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUser(userId: string) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) return [];
    return this.prisma.account.findMany({
      where: { customerId: profile.id, isSystem: false },
      select: {
        id: true,
        iban: true,
        currency: true,
        availableBalance: true,
        accountType: true,
        status: true,
        openedAt: true,
      },
      orderBy: { openedAt: 'asc' },
    });
  }
}
