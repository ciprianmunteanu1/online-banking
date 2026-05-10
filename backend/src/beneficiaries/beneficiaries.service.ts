import {
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BeneficiaryStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';

@Injectable()
export class BeneficiariesService {
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
    return this.prisma.beneficiary.findMany({
      where: { customerId, status: BeneficiaryStatus.ACTIVE },
      select: { id: true, displayName: true, alias: true, iban: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateBeneficiaryDto) {
    const customerId = await this.profileId(userId);
    const ibanNorm = dto.iban.trim().toUpperCase();
    const select = { id: true, displayName: true, alias: true, iban: true, createdAt: true } as const;

    // Check for any existing record with this (customerId, iban) regardless of status
    const existing = await this.prisma.beneficiary.findFirst({
      where: { customerId, iban: ibanNorm },
      select: { id: true, status: true },
    });

    if (existing) {
      if (existing.status === BeneficiaryStatus.ACTIVE) {
        throw new ConflictException(
          'A beneficiary with this IBAN already exists for your account.',
        );
      }

      // ARCHIVED → reactivate
      const ben = await this.prisma.beneficiary.update({
        where: { id: existing.id },
        data: {
          displayName: dto.name,
          alias: dto.alias ?? null,
          status: BeneficiaryStatus.ACTIVE,
          archivedAt: null,
        },
        select,
      });
      await this.prisma.auditEvent.create({
        data: {
          actorUserId: userId,
          action: 'BENEFICIARY_REACTIVATED',
          resourceType: 'Beneficiary',
          resourceId: ben.id,
          metadata: { displayName: ben.displayName, iban: ben.iban },
        },
      });
      return { httpStatus: HttpStatus.OK, body: ben };
    }

    // No prior record → create fresh
    const ben = await this.prisma.beneficiary.create({
      data: { customerId, displayName: dto.name, alias: dto.alias ?? null, iban: ibanNorm },
      select,
    });
    await this.prisma.auditEvent.create({
      data: {
        actorUserId: userId,
        action: 'BENEFICIARY_CREATED',
        resourceType: 'Beneficiary',
        resourceId: ben.id,
        metadata: { displayName: ben.displayName, iban: ben.iban },
      },
    });
    return { httpStatus: HttpStatus.CREATED, body: ben };
  }

  async remove(userId: string, beneficiaryId: string): Promise<void> {
    const customerId = await this.profileId(userId);
    const ben = await this.prisma.beneficiary.findFirst({
      where: { id: beneficiaryId, customerId },
      select: { id: true, displayName: true, iban: true, status: true },
    });
    if (!ben || ben.status === BeneficiaryStatus.ARCHIVED) {
      throw new NotFoundException('Beneficiary not found');
    }
    await this.prisma.beneficiary.update({
      where: { id: ben.id },
      data: { status: BeneficiaryStatus.ARCHIVED, archivedAt: new Date() },
    });
    await this.prisma.auditEvent.create({
      data: {
        actorUserId: userId,
        action: 'BENEFICIARY_DELETED',
        resourceType: 'Beneficiary',
        resourceId: ben.id,
        metadata: { displayName: ben.displayName, iban: ben.iban },
      },
    });
  }
}
