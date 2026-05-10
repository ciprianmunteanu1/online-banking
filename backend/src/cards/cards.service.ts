import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CardStatus } from '@prisma/client';

@Injectable()
export class CardsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCards(userId: string) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });
    if (!profile) return [];

    const cards = await this.prisma.card.findMany({
      where: { customerId: profile.id },
      include: {
        account: {
          select: { id: true, iban: true, accountType: true, currency: true },
        },
      },
    });

    return cards;
  }

  async blockCard(userId: string, cardId: string) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Card not found');

    const card = await this.prisma.card.findFirst({
      where: { id: cardId, customerId: profile.id },
    });

    if (!card) throw new NotFoundException('Card not found');

    const updatedCard = await this.prisma.card.update({
      where: { id: card.id },
      data: { status: CardStatus.BLOCKED, blockedAt: new Date() },
    });

    await this.prisma.auditEvent.create({
      data: {
        actorUserId: userId,
        action: 'CARD_BLOCKED',
        resourceType: 'Card',
        resourceId: card.id,
        metadata: { maskedPan: card.maskedPan },
      },
    });

    return updatedCard;
  }

  async unblockCard(userId: string, cardId: string) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Card not found');

    if (profile.kycStatus !== 'VERIFIED') {
      throw new ForbiddenException({
        code: 'KYC_REQUIRED',
        message: 'Customer identity verification is required before unblocking cards.',
      });
    }

    const card = await this.prisma.card.findFirst({
      where: { id: cardId, customerId: profile.id },
    });

    if (!card) throw new NotFoundException('Card not found');

    const updatedCard = await this.prisma.card.update({
      where: { id: card.id },
      data: { status: CardStatus.ACTIVE, blockedAt: null },
    });

    await this.prisma.auditEvent.create({
      data: {
        actorUserId: userId,
        action: 'CARD_UNBLOCKED',
        resourceType: 'Card',
        resourceId: card.id,
        metadata: { maskedPan: card.maskedPan },
      },
    });

    return updatedCard;
  }
}
