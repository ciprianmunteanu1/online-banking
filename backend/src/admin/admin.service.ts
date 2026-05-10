import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountStatus, KycStatus, TransactionStatus, TransactionType } from '@prisma/client';
import { AdminCreditDto } from './dto/admin-credit.dto';

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

  async creditAccount(adminUserId: string, accountId: string, dto: AdminCreditDto) {
    if (dto.currency !== 'RON') {
      throw new BadRequestException('Only RON currency is currently supported.');
    }

    return this.prisma.$transaction(
      async (tx) => {
        const targetAccount = await tx.account.findUnique({
          where: { id: accountId },
          include: { customer: true },
        });

        if (!targetAccount || targetAccount.isSystem) {
          throw new NotFoundException('Target account not found or is a system account');
        }

        if (targetAccount.status !== AccountStatus.ACTIVE) {
          throw new BadRequestException('Target account is not active');
        }

        const systemAccount = await tx.account.findFirst({
          where: { isSystem: true, currency: 'RON', status: AccountStatus.ACTIVE },
        });

        if (!systemAccount) {
          throw new BadRequestException('System settlement account not found');
        }

        const amount = dto.amount;

        await tx.account.update({
          where: { id: systemAccount.id },
          data: { availableBalance: { decrement: amount } },
        });

        await tx.account.update({
          where: { id: targetAccount.id },
          data: { availableBalance: { increment: amount } },
        });

        const transaction = await tx.transaction.create({
          data: {
            type: TransactionType.ADMIN_CREDIT,
            status: TransactionStatus.POSTED,
            amount,
            currency: 'RON',
            description: dto.description || 'Admin credit funding',
            customerId: targetAccount.customerId,
            fromAccountId: systemAccount.id,
            toAccountId: targetAccount.id,
            ledgerEntries: {
              create: [
                {
                  accountId: systemAccount.id,
                  side: 'DEBIT',
                  amount,
                  currency: 'RON',
                },
                {
                  accountId: targetAccount.id,
                  side: 'CREDIT',
                  amount,
                  currency: 'RON',
                },
              ],
            },
          },
        });

        await tx.auditEvent.create({
          data: {
            actorUserId: adminUserId,
            action: 'ACCOUNT_CREDITED_BY_ADMIN',
            resourceType: 'Transaction',
            resourceId: transaction.id,
            metadata: { targetAccountId: targetAccount.id, amount, currency: 'RON' },
          },
        });

        return {
          transactionId: transaction.id,
          targetAccountId: targetAccount.id,
          amount,
          currency: 'RON',
          ledgerBalanced: true,
        };
      },
      { isolationLevel: 'Serializable' },
    );
  }
}
