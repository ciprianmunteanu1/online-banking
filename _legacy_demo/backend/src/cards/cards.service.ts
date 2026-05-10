import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class CardsService {
    private readonly algorithm = 'aes-256-cbc';
    private readonly key: Buffer;

    constructor(private prisma: PrismaService) {
        const envKey = process.env.ENCRYPTION_KEY || 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';
        // Ensure 32 bytes for AES-256
        this.key = crypto
            .createHash('sha256')
            .update(envKey)
            .digest();
    }

    // ─── Encrypt / Decrypt helpers ────────────────────────────────

    private encrypt(text: string): string {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }

    private decrypt(encryptedText: string): string {
        const [ivHex, encrypted] = encryptedText.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }

    private maskCardNumber(number: string): string {
        return `**** **** **** ${number.slice(-4)}`;
    }

    private generateCardNumber(): string {
        // Generate a 16-digit card number (simplified)
        const prefix = '4'; // Visa-like
        const body = Array.from({ length: 15 }, () =>
            Math.floor(Math.random() * 10),
        ).join('');
        return prefix + body;
    }

    // ─── CRUD Operations ─────────────────────────────────────────

    async getCardsByAccount(userId: string, accountId: string) {
        // Verify account belongs to user
        const account = await this.prisma.account.findFirst({
            where: { id: accountId, userId },
        });

        if (!account) {
            throw new NotFoundException('Account not found');
        }

        return this.prisma.card.findMany({
            where: { accountId },
            select: {
                id: true,
                maskedNumber: true,
                expiryDate: true,
                status: true,
                createdAt: true,
                accountId: true,
            },
        });
    }

    async getAllUserCards(userId: string) {
        const accounts = await this.prisma.account.findMany({
            where: { userId },
            select: { id: true },
        });

        return this.prisma.card.findMany({
            where: { accountId: { in: accounts.map((a) => a.id) } },
            select: {
                id: true,
                maskedNumber: true,
                expiryDate: true,
                status: true,
                createdAt: true,
                accountId: true,
                account: {
                    select: { iban: true, currency: true },
                },
            },
        });
    }

    async createCard(userId: string, accountId: string) {
        const account = await this.prisma.account.findFirst({
            where: { id: accountId, userId },
        });

        if (!account) {
            throw new NotFoundException('Account not found');
        }

        const cardNumber = this.generateCardNumber();
        const expiryDate = this.generateExpiryDate();
        const cvv = String(Math.floor(Math.random() * 900) + 100);

        const card = await this.prisma.card.create({
            data: {
                accountId,
                maskedNumber: this.maskCardNumber(cardNumber),
                encryptedNumber: this.encrypt(cardNumber),
                expiryDate,
                cvvHash: crypto.createHash('sha256').update(cvv).digest('hex'),
                status: 'ACTIVE',
            },
        });

        // Return full card details only on creation
        return {
            id: card.id,
            cardNumber, // Only shown once!
            maskedNumber: card.maskedNumber,
            expiryDate: card.expiryDate,
            cvv, // Only shown once!
            status: card.status,
            message: 'Card created. Save your details — they won\'t be shown again.',
        };
    }

    async blockCard(userId: string, cardId: string) {
        const card = await this.findUserCard(userId, cardId);

        if (card.status === 'BLOCKED_TEMPORARILY') {
            throw new BadRequestException('Card is already blocked');
        }

        await this.prisma.card.update({
            where: { id: cardId },
            data: { status: 'BLOCKED_TEMPORARILY' },
        });

        return { message: 'Card blocked temporarily' };
    }

    async reactivateCard(userId: string, cardId: string) {
        const card = await this.findUserCard(userId, cardId);

        if (card.status === 'ACTIVE') {
            throw new BadRequestException('Card is already active');
        }

        if (card.status === 'BLOCKED_PERMANENTLY') {
            throw new BadRequestException('Cannot reactivate a permanently blocked card');
        }

        await this.prisma.card.update({
            where: { id: cardId },
            data: { status: 'ACTIVE' },
        });

        return { message: 'Card reactivated' };
    }

    // ─── Helpers ──────────────────────────────────────────────────

    private async findUserCard(userId: string, cardId: string) {
        const card = await this.prisma.card.findUnique({
            where: { id: cardId },
            include: { account: { select: { userId: true } } },
        });

        if (!card || card.account.userId !== userId) {
            throw new NotFoundException('Card not found');
        }

        return card;
    }

    private generateExpiryDate(): string {
        const now = new Date();
        const expMonth = String(now.getMonth() + 1).padStart(2, '0');
        const expYear = String((now.getFullYear() + 3) % 100).padStart(2, '0');
        return `${expMonth}/${expYear}`;
    }
}
