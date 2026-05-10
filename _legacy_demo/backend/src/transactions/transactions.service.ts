import {
    Injectable,
    ConflictException,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RiskService } from '../risk/risk.service';
import { CreateTransferDto, MerchantPaymentDto } from './dto/create-transfer.dto';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TransactionsService {
    constructor(
        private prisma: PrismaService,
        private riskService: RiskService,
    ) { }

    // ─── Transfer Between Accounts ────────────────────────────────

    async createTransfer(userId: string, dto: CreateTransferDto) {
        // 1. Idempotency check
        const existing = await this.prisma.transaction.findUnique({
            where: { idempotencyKey: dto.idempotencyKey },
        });

        if (existing) {
            return {
                message: 'Transfer already processed (idempotency)',
                transaction: existing,
            };
        }

        // 2. Validate source account belongs to user
        const sourceAccount = await this.prisma.account.findFirst({
            where: { id: dto.sourceAccountId, userId },
        });

        if (!sourceAccount) {
            throw new NotFoundException('Source account not found');
        }

        if (sourceAccount.status !== 'ACTIVE') {
            throw new BadRequestException('Source account is not active');
        }

        // 3. Find destination account
        const destAccount = await this.prisma.account.findUnique({
            where: { iban: dto.destinationIban },
        });

        if (!destAccount) {
            throw new NotFoundException('Destination account not found');
        }

        if (destAccount.id === sourceAccount.id) {
            throw new BadRequestException('Cannot transfer to the same account');
        }

        const isInternalTransfer = destAccount.userId === userId;

        // 4. Risk scoring
        const riskResult = this.riskService.evaluateRisk({
            amount: dto.amount,
            currency: dto.currency,
            sourceUserId: userId,
            destinationIban: dto.destinationIban,
            isInternalTransfer,
        });

        const riskLevel = this.riskService.getRiskLevel(riskResult.score);

        // 5. If high risk, reject immediately
        if (riskLevel === 'HIGH') {
            const rejectedTx = await this.prisma.transaction.create({
                data: {
                    referenceId: uuidv4(),
                    idempotencyKey: dto.idempotencyKey,
                    amount: dto.amount,
                    currency: dto.currency,
                    description: dto.description,
                    status: 'REJECTED',
                    riskScore: riskResult.score,
                    metadata: { reasons: riskResult.reasons } as any,
                },
            });

            return {
                message: 'Transfer rejected due to high risk score',
                transaction: rejectedTx,
                riskScore: riskResult.score,
                riskReasons: riskResult.reasons,
            };
        }

        // 6. Execute transfer within a database transaction with row-level locking
        const result = await this.prisma.$transaction(async (tx) => {
            // Lock source account row (pessimistic locking via raw query)
            const [lockedSource] = await tx.$queryRaw<any[]>`
        SELECT * FROM accounts WHERE id = ${sourceAccount.id} FOR UPDATE
      `;

            // Check sufficient balance
            const balance = new Prisma.Decimal(lockedSource.balance);
            if (balance.lessThan(dto.amount)) {
                throw new BadRequestException('Insufficient balance');
            }

            // Lock destination account
            await tx.$queryRaw`
        SELECT * FROM accounts WHERE id = ${destAccount.id} FOR UPDATE
      `;

            // Create transaction record
            const transaction = await tx.transaction.create({
                data: {
                    referenceId: uuidv4(),
                    idempotencyKey: dto.idempotencyKey,
                    amount: dto.amount,
                    currency: dto.currency,
                    description: dto.description,
                    status: riskLevel === 'MEDIUM' ? 'PENDING' : 'COMPLETED',
                    riskScore: riskResult.score,
                    metadata: riskLevel === 'MEDIUM'
                        ? ({ reasons: riskResult.reasons, flagged: true } as any)
                        : undefined,
                },
            });

            // Create double-entry ledger entries
            await tx.ledgerEntry.createMany({
                data: [
                    {
                        transactionId: transaction.id,
                        accountId: sourceAccount.id,
                        type: 'DEBIT',
                        amount: dto.amount,
                    },
                    {
                        transactionId: transaction.id,
                        accountId: destAccount.id,
                        type: 'CREDIT',
                        amount: dto.amount,
                    },
                ],
            });

            // Update balances
            await tx.account.update({
                where: { id: sourceAccount.id },
                data: { balance: { decrement: dto.amount } },
            });

            await tx.account.update({
                where: { id: destAccount.id },
                data: { balance: { increment: dto.amount } },
            });

            return transaction;
        });

        return {
            message:
                riskLevel === 'MEDIUM'
                    ? 'Transfer pending review (flagged as suspicious)'
                    : 'Transfer completed successfully',
            transaction: result,
            riskScore: riskResult.score,
        };
    }

    // ─── Merchant Payment (simulated) ─────────────────────────────

    async createMerchantPayment(userId: string, dto: MerchantPaymentDto) {
        // Idempotency check
        const existing = await this.prisma.transaction.findUnique({
            where: { idempotencyKey: dto.idempotencyKey },
        });

        if (existing) {
            return { message: 'Payment already processed', transaction: existing };
        }

        // Validate source account
        const sourceAccount = await this.prisma.account.findFirst({
            where: { id: dto.sourceAccountId, userId },
        });

        if (!sourceAccount || sourceAccount.status !== 'ACTIVE') {
            throw new BadRequestException('Invalid source account');
        }

        // Risk scoring
        const riskResult = this.riskService.evaluateRisk({
            amount: dto.amount,
            currency: dto.currency,
            sourceUserId: userId,
            destinationIban: `MERCHANT-${dto.merchantName}`,
            isInternalTransfer: false,
        });

        const riskLevel = this.riskService.getRiskLevel(riskResult.score);

        if (riskLevel === 'HIGH') {
            const rejectedTx = await this.prisma.transaction.create({
                data: {
                    referenceId: uuidv4(),
                    idempotencyKey: dto.idempotencyKey,
                    amount: dto.amount,
                    currency: dto.currency,
                    description: `Payment to ${dto.merchantName}`,
                    status: 'REJECTED',
                    riskScore: riskResult.score,
                    metadata: { reasons: riskResult.reasons, merchant: dto.merchantName } as any,
                },
            });

            return {
                message: 'Payment rejected due to high risk',
                transaction: rejectedTx,
            };
        }

        const result = await this.prisma.$transaction(async (tx) => {
            const [lockedSource] = await tx.$queryRaw<any[]>`
        SELECT * FROM accounts WHERE id = ${sourceAccount.id} FOR UPDATE
      `;

            const balance = new Prisma.Decimal(lockedSource.balance);
            if (balance.lessThan(dto.amount)) {
                throw new BadRequestException('Insufficient balance');
            }

            const transaction = await tx.transaction.create({
                data: {
                    referenceId: uuidv4(),
                    idempotencyKey: dto.idempotencyKey,
                    amount: dto.amount,
                    currency: dto.currency,
                    description: `Payment to ${dto.merchantName}`,
                    status: 'COMPLETED',
                    riskScore: riskResult.score,
                    metadata: { merchant: dto.merchantName } as any,
                },
            });

            // Only debit entry for merchant payments (money leaves the system)
            await tx.ledgerEntry.create({
                data: {
                    transactionId: transaction.id,
                    accountId: sourceAccount.id,
                    type: 'DEBIT',
                    amount: dto.amount,
                },
            });

            await tx.account.update({
                where: { id: sourceAccount.id },
                data: { balance: { decrement: dto.amount } },
            });

            return transaction;
        });

        return {
            message: 'Merchant payment completed',
            transaction: result,
        };
    }

    // ─── Get Transactions ─────────────────────────────────────────

    async getUserTransactions(userId: string, page = 1, limit = 20) {
        const accounts = await this.prisma.account.findMany({
            where: { userId },
            select: { id: true },
        });

        const accountIds = accounts.map((a) => a.id);

        const [transactions, total] = await Promise.all([
            this.prisma.ledgerEntry.findMany({
                where: { accountId: { in: accountIds } },
                include: {
                    transaction: true,
                    account: { select: { iban: true, currency: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.ledgerEntry.count({
                where: { accountId: { in: accountIds } },
            }),
        ]);

        return {
            data: transactions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getTransactionById(transactionId: string) {
        const transaction = await this.prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                ledgerEntries: {
                    include: {
                        account: { select: { iban: true, currency: true, userId: true } },
                    },
                },
            },
        });

        if (!transaction) {
            throw new NotFoundException('Transaction not found');
        }

        return transaction;
    }

    // ─── Admin: Get Suspicious Transactions ───────────────────────

    async getSuspiciousTransactions(page = 1, limit = 20) {
        const [transactions, total] = await Promise.all([
            this.prisma.transaction.findMany({
                where: {
                    OR: [{ riskScore: { gte: 50 } }, { status: 'REJECTED' }],
                },
                include: {
                    ledgerEntries: {
                        include: {
                            account: { select: { iban: true, userId: true } },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.transaction.count({
                where: {
                    OR: [{ riskScore: { gte: 50 } }, { status: 'REJECTED' }],
                },
            }),
        ]);

        return {
            data: transactions,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }
}
