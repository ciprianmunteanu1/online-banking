import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountStatus, KycStatus, Prisma, TransactionStatus, TransactionType } from '@prisma/client';
import { AdminCreditDto } from './dto/admin-credit.dto';
import { NotificationsService } from '../notifications/notifications.service';

type AuditEventFilters = {
  action?: string;
  resourceType?: string;
  actorUserId?: string;
  from?: string;
  to?: string;
  page?: string;
  limit?: string;
};

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService
  ) {}

  async getCustomers() {
    return this.prisma.customerProfile.findMany({
      where: {
        OR: [
          { accounts: { none: {} } },
          { accounts: { some: { isSystem: false } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        user: { select: { id: true, email: true } },
        fullLegalName: true,
        kycStatus: true,
        verifiedAt: true,
        createdAt: true,
        accounts: {
          where: { isSystem: false },
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

  async getAuditEvents(filters: AuditEventFilters) {
    const page = this.parsePositiveInt(filters.page, 1, 'page');
    const limit = Math.min(this.parsePositiveInt(filters.limit, 25, 'limit'), 100);
    const where: Prisma.AuditEventWhereInput = {};

    if (filters.action) where.action = filters.action;
    if (filters.resourceType) where.resourceType = filters.resourceType;
    if (filters.actorUserId) where.actorUserId = filters.actorUserId;

    const createdAt: Prisma.DateTimeFilter = {};
    if (filters.from) createdAt.gte = this.parseDate(filters.from, 'from');
    if (filters.to) createdAt.lte = this.parseDate(filters.to, 'to');
    if (createdAt.gte || createdAt.lte) where.createdAt = createdAt;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          actorUserId: true,
          action: true,
          resourceType: true,
          resourceId: true,
          ipAddress: true,
          userAgent: true,
          metadata: true,
          createdAt: true,
        },
      }),
      this.prisma.auditEvent.count({ where }),
    ]);

    return { items, page, limit, total };
  }

  private parsePositiveInt(value: string | undefined, fallback: number, label: string) {
    if (!value) return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException(`${label} must be a positive integer`);
    }
    return parsed;
  }

  private parseDate(value: string, label: string) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${label} must be a valid date`);
    }
    return parsed;
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

    const title = status === KycStatus.VERIFIED ? 'KYC Verified' : 'KYC Rejected';
    const message = status === KycStatus.VERIFIED
      ? 'Your identity has been verified successfully.'
      : 'Your identity verification was rejected. Please contact support.';
    
    await this.notifications.create(customer.userId, action, title, message);

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

        await this.notifications.create(
          targetAccount.customer.userId,
          'ACCOUNT_CREDITED_BY_ADMIN',
          'Account Credited',
          `Your account ${targetAccount.iban} has been credited with ${amount} RON by an administrator.`
        );

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
