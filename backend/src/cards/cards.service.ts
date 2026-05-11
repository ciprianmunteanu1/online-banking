import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CardStatus } from '@prisma/client';
import { IssueCardDto } from './dto/issue-card.dto';
import { VerifyRevealDto } from './dto/verify-reveal.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CardsService {
  private readonly logger = new Logger(CardsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
  ) {}

  async getCards(userId: string) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });
    if (!profile) return [];

    const cards = await this.prisma.card.findMany({
      where: { 
        customerId: profile.id,
        status: { not: CardStatus.CLOSED }
      },
      select: {
        id: true,
        maskedPan: true,
        cardType: true,
        status: true,
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

    await this.notifications.create(
      userId,
      'CARD_BLOCKED',
      'Card Blocked',
      `Your card ending in ${card.maskedPan.slice(-4)} has been blocked.`
    );

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

    await this.notifications.create(
      userId,
      'CARD_UNBLOCKED',
      'Card Unblocked',
      `Your card ending in ${card.maskedPan.slice(-4)} has been unblocked.`
    );

    return updatedCard;
  }

  async issueCard(userId: string, dto: IssueCardDto) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Customer not found');

    if (profile.kycStatus !== 'VERIFIED') {
      throw new ForbiddenException({
        code: 'KYC_REQUIRED',
        message: 'Customer identity verification is required before issuing cards.',
      });
    }

    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, customerId: profile.id, status: 'ACTIVE', isSystem: false },
    });

    if (!account) throw new NotFoundException('Active non-system account not found');

    // Generate simulated details
    const last4 = Math.floor(1000 + Math.random() * 9000).toString();
    const maskedPan = `**** **** **** ${last4}`;
    const demoPan = `4242 4242 4242 ${last4}`; // fake test number
    const expiryMonth = new Date().getMonth() + 1;
    const expiryYear = (new Date().getFullYear() % 100) + 4;
    const demoCvv = Math.floor(100 + Math.random() * 900).toString();

    const card = await this.prisma.card.create({
      data: {
        customerId: profile.id,
        accountId: account.id,
        cardType: dto.cardType,
        maskedPan,
        demoPan,
        expiryMonth,
        expiryYear,
        demoCvv,
        status: CardStatus.ACTIVE,
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        actorUserId: userId,
        action: 'CARD_ISSUED',
        resourceType: 'Card',
        resourceId: card.id,
        metadata: { maskedPan: card.maskedPan },
      },
    });

    await this.notifications.create(
      userId,
      'CARD_ISSUED',
      'Card Issued',
      `A new ${card.cardType.toLowerCase()} card ending in ${card.maskedPan.slice(-4)} has been issued.`
    );

    return {
      id: card.id,
      maskedPan: card.maskedPan,
      cardType: card.cardType,
      status: card.status,
    };
  }

  async closeCard(userId: string, cardId: string) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Card not found');

    const card = await this.prisma.card.findFirst({
      where: { id: cardId, customerId: profile.id, status: { not: CardStatus.CLOSED } },
    });

    if (!card) throw new NotFoundException('Card not found');

    await this.prisma.card.update({
      where: { id: card.id },
      data: { status: CardStatus.CLOSED, closedAt: new Date() },
    });

    await this.prisma.auditEvent.create({
      data: {
        actorUserId: userId,
        action: 'CARD_CLOSED',
        resourceType: 'Card',
        resourceId: card.id,
        metadata: { maskedPan: card.maskedPan },
      },
    });

    await this.notifications.create(
      userId,
      'CARD_CLOSED',
      'Card Closed',
      `Your card ending in ${card.maskedPan.slice(-4)} has been permanently closed.`
    );

    return { success: true };
  }

  async initiateReveal(userId: string, cardId: string) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Card not found');

    const card = await this.prisma.card.findFirst({
      where: { id: cardId, customerId: profile.id, status: { not: CardStatus.CLOSED } },
    });

    if (!card) throw new NotFoundException('Card not found');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const redisKey = `card:reveal:${userId}:${card.id}`;
    
    await this.redis.redis.set(redisKey, otp, 'EX', 300);

    this.logger.log(`[Card reveal mock] OTP for card ${card.id}: ${otp}`);

    return { challengeRequired: true, expiresInSeconds: 300 };
  }

  async verifyReveal(userId: string, cardId: string, dto: VerifyRevealDto) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Card not found');

    const card = await this.prisma.card.findFirst({
      where: { id: cardId, customerId: profile.id, status: { not: CardStatus.CLOSED } },
    });

    if (!card) throw new NotFoundException('Card not found');

    const redisKey = `card:reveal:${userId}:${card.id}`;
    const storedOtp = await this.redis.redis.get(redisKey);

    if (!storedOtp) {
      throw new BadRequestException('OTP expired or invalid');
    }

    if (storedOtp !== dto.otp) {
      throw new BadRequestException('Invalid OTP');
    }

    await this.redis.redis.del(redisKey);

    await this.prisma.auditEvent.create({
      data: {
        actorUserId: userId,
        action: 'CARD_DETAILS_REVEALED',
        resourceType: 'Card',
        resourceId: card.id,
        metadata: { maskedPan: card.maskedPan },
      },
    });

    return {
      cardNumber: card.demoPan,
      expiry: `${card.expiryMonth?.toString().padStart(2, '0')}/${card.expiryYear}`,
      cvv: card.demoCvv,
      revealExpiresInSeconds: 60,
    };
  }
}
