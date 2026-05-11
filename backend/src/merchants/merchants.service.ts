import { Injectable } from '@nestjs/common';
import { MerchantStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MerchantsService {
  constructor(private readonly prisma: PrismaService) {}

  findActive() {
    return this.prisma.merchant.findMany({
      where: { status: MerchantStatus.ACTIVE },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        merchantCode: true,
        category: true,
      },
    });
  }
}
