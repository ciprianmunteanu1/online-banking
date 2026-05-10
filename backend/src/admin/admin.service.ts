import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KycStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getCustomers() {
    return this.prisma.customerProfile.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        user: { select: { id: true, email: true } },
        fullLegalName: true,
        kycStatus: true,
        verifiedAt: true,
        createdAt: true,
        accounts: {
          select: {
            id: true,
            iban: true,
            accountType: true,
            status: true,
            availableBalance: true,
            currency: true,
          },
        },
      },
    });
  }

  async updateKycStatus(adminUserId: string, customerId: string, status: KycStatus) {
    const customer = await this.prisma.customerProfile.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    const verifiedAt = status === KycStatus.VERIFIED ? new Date() : null;

    const updated = await this.prisma.customerProfile.update({
      where: { id: customerId },
      data: { kycStatus: status, verifiedAt },
    });

    const action = status === KycStatus.VERIFIED ? 'CUSTOMER_VERIFIED' : 'CUSTOMER_REJECTED';

    await this.prisma.auditEvent.create({
      data: {
        actorUserId: adminUserId,
        action,
        resourceType: 'CustomerProfile',
        resourceId: customer.id,
      },
    });

    return updated;
  }
}
