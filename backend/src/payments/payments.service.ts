import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  AccountStatus,
  IdempotencyStatus,
  LedgerSide,
  Prisma,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import type { JwtAccessPayload } from '../auth/auth.types';
import type { CreateTransferDto } from './dto/create-transfer.dto';
import type { TransferToBeneficiaryDto } from './dto/transfer-to-beneficiary.dto';
import type {
  TransferServiceResult,
  TransferSuccessResponse,
  BeneficiaryTransferServiceResult,
  BeneficiaryTransferSuccessResponse,
} from './payments.types';
import { StepUpRequiredException } from './exceptions/step-up-required.exception';

const TRANSFER_SCOPE = 'POST /payments/transfer';
const STEP_UP_THRESHOLD = new Prisma.Decimal(1000);
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const SERIALIZABLE_RETRIES = 5;

function isPrismaUniqueViolation(
  err: unknown,
): err is { code: string; meta?: { target?: string[] } } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2002'
  );
}

function isSerializationFailure(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2034'
  );
}

function stableRequestHash(
  dto: CreateTransferDto,
  currencyNorm: string,
): string {
  const canonical = JSON.stringify({
    amount: dto.amount,
    currency: currencyNorm,
    description: dto.description ?? null,
    destinationAccountId: dto.destinationAccountId,
    sourceAccountId: dto.sourceAccountId,
  });
  return createHash('sha256').update(canonical).digest('hex');
}

function stableBeneficiaryRequestHash(
  dto: TransferToBeneficiaryDto,
  currencyNorm: string,
): string {
  const canonical = JSON.stringify({
    amount: dto.amount,
    currency: currencyNorm,
    description: dto.description ?? null,
    beneficiaryId: dto.beneficiaryId,
    sourceAccountId: dto.sourceAccountId,
  });
  return createHash('sha256').update(canonical).digest('hex');
}

function parseCompletedPayload(
  raw: Prisma.JsonValue | null | undefined,
): TransferSuccessResponse | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const o = raw as Record<string, unknown>;
  if (
    typeof o.transactionId === 'string' &&
    typeof o.status === 'string' &&
    typeof o.sourceAccountId === 'string' &&
    typeof o.destinationAccountId === 'string' &&
    typeof o.amount === 'string' &&
    typeof o.currency === 'string' &&
    o.ledgerBalanced === true
  ) {
    return {
      transactionId: o.transactionId,
      status: o.status,
      sourceAccountId: o.sourceAccountId,
      destinationAccountId: o.destinationAccountId,
      amount: o.amount,
      currency: o.currency,
      ledgerBalanced: true,
    };
  }
  return null;
}

function parseBeneficiaryCompletedPayload(
  raw: Prisma.JsonValue | null | undefined,
): BeneficiaryTransferSuccessResponse | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const o = raw as Record<string, unknown>;
  if (
    typeof o.transactionId === 'string' &&
    typeof o.status === 'string' &&
    typeof o.sourceAccountId === 'string' &&
    typeof o.beneficiaryId === 'string' &&
    typeof o.beneficiaryIban === 'string' &&
    typeof o.amount === 'string' &&
    typeof o.currency === 'string' &&
    typeof o.internalBeneficiary === 'boolean' &&
    o.ledgerBalanced === true
  ) {
    return {
      transactionId: o.transactionId,
      status: o.status,
      sourceAccountId: o.sourceAccountId,
      beneficiaryId: o.beneficiaryId,
      beneficiaryIban: o.beneficiaryIban,
      amount: o.amount,
      currency: o.currency,
      internalBeneficiary: o.internalBeneficiary,
      ledgerBalanced: true,
    };
  }
  return null;
}

import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
  ) {}

  async runMockFraudCheck(
    userId: string,
    idempotencyKey: string,
    amount: Prisma.Decimal,
    type: 'INTERNAL_TRANSFER' | 'BENEFICIARY_TRANSFER',
    requestBody: any,
  ): Promise<void> {
    if (amount.gt(STEP_UP_THRESHOLD)) {
      const existing = await this.prisma.idempotencyKey.findUnique({
        where: { userId_key: { userId, key: idempotencyKey } },
      });
      if (existing?.status === IdempotencyStatus.COMPLETED) {
        return;
      }
      
      const challengeId = Math.random().toString(36).substring(2, 15);
      const redisKey = `stepup:transfer:${userId}:${challengeId}`;
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const payload = {
        userId,
        type,
        requestBody,
        idempotencyKey,
        createdAt: new Date().toISOString(),
      };
      await this.redis.redis.set(redisKey, JSON.stringify({ payload, otp }), 'EX', 300);
      
      this.logger.log(`[Step-up mock] OTP for transfer challenge ${challengeId}: ${otp}`);

      throw new StepUpRequiredException(challengeId, 300);
    }
  }

  async transfer(
    user: JwtAccessPayload,
    dto: CreateTransferDto,
    idempotencyKey: string,
    skipFraudCheck = false,
  ): Promise<TransferServiceResult> {
    if (!idempotencyKey.trim()) {
      throw new BadRequestException('x-idempotency-key header is required');
    }

    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId: user.sub },
      select: { kycStatus: true },
    });

    if (!profile || profile.kycStatus !== 'VERIFIED') {
      throw new ForbiddenException({
        code: 'KYC_REQUIRED',
        message: 'Customer identity verification is required before transfers.',
      });
    }

    if (dto.sourceAccountId === dto.destinationAccountId) {
      throw new BadRequestException(
        'sourceAccountId and destinationAccountId must differ',
      );
    }

    const currency = (dto.currency ?? 'RON').trim().toUpperCase();
    if (currency !== 'RON') {
      throw new BadRequestException('Only RON currency is supported in MVP');
    }

    const amountDecimal = new Prisma.Decimal(dto.amount);
    
    if (!skipFraudCheck) {
      await this.runMockFraudCheck(user.sub, idempotencyKey.trim(), amountDecimal, 'INTERNAL_TRANSFER', dto);
    }

    const requestHash = stableRequestHash(dto, currency);

    for (let attempt = 1; attempt <= SERIALIZABLE_RETRIES; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (tx: Prisma.TransactionClient) =>
            this.executeTransferTx(
              tx,
              user.sub,
              dto,
              idempotencyKey.trim(),
              currency,
              amountDecimal,
              requestHash,
            ),
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            maxWait: 10_000,
            timeout: 30_000,
          },
        );
      } catch (err) {
        if (isSerializationFailure(err) && attempt < SERIALIZABLE_RETRIES) {
          continue;
        }
        throw err;
      }
    }
    throw new Error('Transfer failed after retries');
  }

  private async executeTransferTx(
    tx: Prisma.TransactionClient,
    userId: string,
    dto: CreateTransferDto,
    idempotencyKey: string,
    currency: string,
    amountDecimal: Prisma.Decimal,
    requestHash: string,
  ): Promise<TransferServiceResult> {
    const existing = await tx.idempotencyKey.findUnique({
      where: {
        userId_key: {
          userId,
          key: idempotencyKey,
        },
      },
    });

    if (existing?.status === IdempotencyStatus.COMPLETED) {
      if (existing.requestHash && existing.requestHash !== requestHash) {
        throw new ConflictException(
          'Idempotency key was already used with a different request body.',
        );
      }
      const parsed = parseCompletedPayload(existing.responsePayload);
      if (!parsed) {
        throw new ConflictException(
          'Stored idempotency response is invalid or missing.',
        );
      }
      return {
        httpStatus: HttpStatus.OK,
        body: parsed,
      };
    }

    if (
      existing?.status === IdempotencyStatus.FAILED ||
      existing?.status === IdempotencyStatus.IN_PROGRESS
    ) {
      throw new ConflictException(
        'This idempotency key is not available for a new transfer.',
      );
    }

    let idemRow: { id: string };
    try {
      idemRow = await tx.idempotencyKey.create({
        data: {
          userId,
          key: idempotencyKey,
          scope: TRANSFER_SCOPE,
          status: IdempotencyStatus.IN_PROGRESS,
          requestHash,
          expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
        },
        select: { id: true },
      });
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        const row = await tx.idempotencyKey.findUnique({
          where: {
            userId_key: { userId, key: idempotencyKey },
          },
        });
        if (!row) {
          throw new ConflictException(
            'Idempotency key conflict; please retry the request.',
          );
        }
        if (row.status === IdempotencyStatus.COMPLETED) {
          if (row.requestHash && row.requestHash !== requestHash) {
            throw new ConflictException(
              'Idempotency key was already used with a different request body.',
            );
          }
          const parsed = parseCompletedPayload(row.responsePayload);
          if (!parsed) {
            throw new ConflictException(
              'Stored idempotency response is invalid or missing.',
            );
          }
          return {
            httpStatus: HttpStatus.OK,
            body: parsed,
          };
        }
        if (row.status === IdempotencyStatus.FAILED) {
          throw new ConflictException(
            'This idempotency key already failed and cannot be reused.',
          );
        }
        throw new ConflictException(
          'Transfer is already in progress for this idempotency key.',
        );
      }
      throw err;
    }

    const profile = await tx.customerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) {
      throw new BadRequestException('Customer profile not found for user');
    }

    const [source, destination] = await Promise.all([
      tx.account.findFirst({
        where: {
          id: dto.sourceAccountId,
          customerId: profile.id,
          status: AccountStatus.ACTIVE,
        },
      }),
      tx.account.findFirst({
        where: {
          id: dto.destinationAccountId,
          customerId: profile.id,
          status: AccountStatus.ACTIVE,
        },
      }),
    ]);

    if (!source) {
      throw new BadRequestException('Source account not found or not allowed');
    }
    if (!destination) {
      throw new BadRequestException(
        'Destination account not found or not allowed',
      );
    }
    if (source.currency !== currency || destination.currency !== currency) {
      throw new BadRequestException(
        'Source, destination, and request currency must match',
      );
    }

    const sourceDebit = await tx.account.updateMany({
      where: {
        id: source.id,
        customerId: profile.id,
        status: AccountStatus.ACTIVE,
        currency,
        availableBalance: { gte: amountDecimal },
      },
      data: {
        availableBalance: { decrement: amountDecimal },
      },
    });

    if (sourceDebit.count !== 1) {
      throw new BadRequestException('Insufficient funds in source account');
    }

    await tx.account.update({
      where: { id: destination.id },
      data: {
        availableBalance: { increment: amountDecimal },
      },
    });

    const now = new Date();
    const txn = await tx.transaction.create({
      data: {
        type: TransactionType.INTERNAL_TRANSFER,
        status: TransactionStatus.POSTED,
        amount: amountDecimal,
        currency,
        description: dto.description ?? null,
        customerId: profile.id,
        fromAccountId: source.id,
        toAccountId: destination.id,
        idempotencyKeyId: idemRow.id,
        postedAt: now,
      },
    });

    await tx.ledgerEntry.createMany({
      data: [
        {
          transactionId: txn.id,
          accountId: source.id,
          side: LedgerSide.DEBIT,
          amount: amountDecimal,
          currency,
          sequence: 0,
        },
        {
          transactionId: txn.id,
          accountId: destination.id,
          side: LedgerSide.CREDIT,
          amount: amountDecimal,
          currency,
          sequence: 1,
        },
      ],
    });

    await tx.auditEvent.create({
      data: {
        actorUserId: userId,
        action: 'PAYMENT_TRANSFER_POSTED',
        resourceType: 'Transaction',
        resourceId: txn.id,
        metadata: {
          sourceAccountId: source.id,
          destinationAccountId: destination.id,
          amount: amountDecimal.toString(),
          currency,
          idempotencyKey,
        },
      },
    });

    await this.notifications.create(
      userId,
      'PAYMENT_TRANSFER_POSTED',
      'Transfer Successful',
      `Your internal transfer of ${amountDecimal.toString()} ${currency} has been posted.`
    );

    const amountOut = amountDecimal.toFixed(2);
    const body: TransferSuccessResponse = {
      transactionId: txn.id,
      status: TransactionStatus.POSTED,
      sourceAccountId: source.id,
      destinationAccountId: destination.id,
      amount: amountOut,
      currency,
      ledgerBalanced: true,
    };

    await tx.idempotencyKey.update({
      where: { id: idemRow.id },
      data: {
        status: IdempotencyStatus.COMPLETED,
        responsePayload: body as unknown as Prisma.InputJsonValue,
        httpStatus: HttpStatus.CREATED,
        completedAt: now,
      },
    });

    return { httpStatus: HttpStatus.CREATED, body };
  }

  async transferToBeneficiary(
    user: JwtAccessPayload,
    dto: TransferToBeneficiaryDto,
    idempotencyKey: string,
    skipFraudCheck = false,
  ): Promise<BeneficiaryTransferServiceResult> {
    if (!idempotencyKey.trim()) {
      throw new BadRequestException('x-idempotency-key header is required');
    }

    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId: user.sub },
      select: { id: true, kycStatus: true },
    });

    if (!profile || profile.kycStatus !== 'VERIFIED') {
      throw new ForbiddenException({
        code: 'KYC_REQUIRED',
        message: 'Customer identity verification is required before transfers.',
      });
    }

    const currency = (dto.currency ?? 'RON').trim().toUpperCase();
    if (currency !== 'RON') {
      throw new BadRequestException('Only RON currency is supported in MVP');
    }

    const amountDecimal = new Prisma.Decimal(dto.amount);
    
    if (!skipFraudCheck) {
      await this.runMockFraudCheck(user.sub, idempotencyKey.trim(), amountDecimal, 'BENEFICIARY_TRANSFER', dto);
    }

    const requestHash = stableBeneficiaryRequestHash(dto, currency);

    for (let attempt = 1; attempt <= SERIALIZABLE_RETRIES; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (tx: Prisma.TransactionClient) =>
            this.executeBeneficiaryTransferTx(
              tx,
              user.sub,
              profile.id,
              dto,
              idempotencyKey.trim(),
              currency,
              amountDecimal,
              requestHash,
            ),
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            maxWait: 10_000,
            timeout: 30_000,
          },
        );
      } catch (err) {
        if (isSerializationFailure(err) && attempt < SERIALIZABLE_RETRIES) continue;
        throw err;
      }
    }
    throw new BadRequestException('Transfer failed after retries');
  }

  private async executeBeneficiaryTransferTx(
    tx: Prisma.TransactionClient,
    userId: string,
    profileId: string,
    dto: TransferToBeneficiaryDto,
    idempotencyKey: string,
    currency: string,
    amountDecimal: Prisma.Decimal,
    requestHash: string,
  ): Promise<BeneficiaryTransferServiceResult> {
    const existingKey = await tx.idempotencyKey.findUnique({
      where: {
        userId_key: { userId, key: idempotencyKey },
      },
    });

    if (existingKey) {
      if (existingKey.requestHash !== requestHash) {
        throw new ConflictException('Idempotency key reused with different request payload');
      }
      if (existingKey.status === IdempotencyStatus.COMPLETED) {
        const payload = parseBeneficiaryCompletedPayload(existingKey.responsePayload);
        if (payload) return { httpStatus: HttpStatus.OK, body: payload };
      }
      if (existingKey.status === IdempotencyStatus.FAILED) {
        throw new BadRequestException('Previous attempt with this key failed');
      }
      throw new ConflictException('A request with this key is currently in progress');
    }

    const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_MS);
    const idemRow = await tx.idempotencyKey.create({
      data: {
        userId,
        key: idempotencyKey,
        scope: 'POST /payments/transfer-to-beneficiary',
        requestHash,
        status: IdempotencyStatus.IN_PROGRESS,
        expiresAt,
      },
    });

    const sourceAccount = await tx.account.findFirst({
      where: {
        id: dto.sourceAccountId,
        customerId: profileId,
        status: AccountStatus.ACTIVE,
        currency,
        isSystem: false,
      },
    });
    if (!sourceAccount) throw new BadRequestException('Source account not found or invalid');
    if (sourceAccount.availableBalance.lt(amountDecimal)) {
      await tx.idempotencyKey.update({ where: { id: idemRow.id }, data: { status: IdempotencyStatus.FAILED } });
      throw new BadRequestException('Insufficient funds');
    }

    const beneficiary = await tx.beneficiary.findFirst({
      where: {
        id: dto.beneficiaryId,
        customerId: profileId,
        status: 'ACTIVE',
      },
    });
    if (!beneficiary) throw new BadRequestException('Beneficiary not found or invalid');

    // internal vs external
    let destinationAccountId: string;
    let internalBeneficiary = false;

    const matchedInternal = await tx.account.findFirst({
      where: {
        iban: beneficiary.iban,
        status: AccountStatus.ACTIVE,
        currency,
        isSystem: false,
      },
    });

    if (matchedInternal) {
      destinationAccountId = matchedInternal.id;
      internalBeneficiary = true;
    } else {
      const extSystem = await tx.account.findFirst({
        where: {
          accountType: 'EXTERNAL_SETTLEMENT',
          isSystem: true,
          status: AccountStatus.ACTIVE,
          currency,
        },
      });
      if (!extSystem) throw new BadRequestException('External settlement account not found');
      destinationAccountId = extSystem.id;
      internalBeneficiary = false;
    }

    if (sourceAccount.id === destinationAccountId) {
      throw new BadRequestException('Cannot transfer to the same account via beneficiary');
    }

    const sourceResult = await tx.account.updateMany({
      where: {
        id: sourceAccount.id,
        availableBalance: { gte: amountDecimal },
      },
      data: {
        availableBalance: { decrement: amountDecimal },
      },
    });

    if (sourceResult.count !== 1) {
      await tx.idempotencyKey.update({ where: { id: idemRow.id }, data: { status: IdempotencyStatus.FAILED } });
      throw new ConflictException('Insufficient funds or concurrent update');
    }

    await tx.account.update({
      where: { id: destinationAccountId },
      data: {
        availableBalance: { increment: amountDecimal },
      },
    });

    const transaction = await tx.transaction.create({
      data: {
        type: TransactionType.BENEFICIARY_TRANSFER,
        status: TransactionStatus.POSTED,
        amount: amountDecimal,
        currency,
        description: dto.description || null,
        customerId: profileId,
        fromAccountId: sourceAccount.id,
        toAccountId: destinationAccountId,
        ledgerEntries: {
          create: [
            {
              accountId: sourceAccount.id,
              side: LedgerSide.DEBIT,
              amount: amountDecimal,
              currency,
              sequence: 0,
            },
            {
              accountId: destinationAccountId,
              side: LedgerSide.CREDIT,
              amount: amountDecimal,
              currency,
              sequence: 1,
            },
          ],
        },
      },
    });

    const successBody: BeneficiaryTransferSuccessResponse = {
      transactionId: transaction.id,
      status: transaction.status,
      sourceAccountId: sourceAccount.id,
      beneficiaryId: beneficiary.id,
      beneficiaryIban: beneficiary.iban,
      amount: amountDecimal.toFixed(2),
      currency,
      internalBeneficiary,
      ledgerBalanced: true,
    };

    await tx.idempotencyKey.update({
      where: { id: idemRow.id },
      data: {
        status: IdempotencyStatus.COMPLETED,
        responsePayload: successBody as unknown as Prisma.InputJsonValue,
        httpStatus: HttpStatus.CREATED,
        completedAt: new Date(),
      },
    });

    await tx.auditEvent.create({
      data: {
        actorUserId: userId,
        action: 'BENEFICIARY_TRANSFER_POSTED',
        resourceType: 'Transaction',
        resourceId: transaction.id,
        metadata: {
          sourceAccountId: sourceAccount.id,
          beneficiaryId: beneficiary.id,
          beneficiaryIban: beneficiary.iban,
          amount: amountDecimal.toFixed(2),
          currency,
          internalBeneficiary,
        },
      },
    });

    await this.notifications.create(
      userId,
      'BENEFICIARY_TRANSFER_POSTED',
      'Transfer Successful',
      `Your transfer to ${beneficiary.displayName} of ${amountDecimal.toFixed(2)} ${currency} has been posted.`
    );

    return {
      httpStatus: HttpStatus.CREATED,
      body: successBody,
    };
  }

  async confirmStepUp(user: JwtAccessPayload, challengeId: string, otp: string) {
    const redisKey = `stepup:transfer:${user.sub}:${challengeId}`;
    const stored = await this.redis.redis.get(redisKey);
    
    if (!stored) {
      throw new BadRequestException('Challenge expired or not found');
    }
    
    const data = JSON.parse(stored);
    if (data.otp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }
    
    await this.redis.redis.del(redisKey);
    
    if (data.payload.type === 'INTERNAL_TRANSFER') {
      return this.transfer(user, data.payload.requestBody as CreateTransferDto, data.payload.idempotencyKey, true);
    } else if (data.payload.type === 'BENEFICIARY_TRANSFER') {
      return this.transferToBeneficiary(user, data.payload.requestBody as TransferToBeneficiaryDto, data.payload.idempotencyKey, true);
    } else {
      throw new BadRequestException('Unknown transfer type');
    }
  }
}
