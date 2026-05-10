import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
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
import type { JwtAccessPayload } from '../auth/auth.types';
import type { CreateTransferDto } from './dto/create-transfer.dto';
import type {
  TransferServiceResult,
  TransferSuccessResponse,
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

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  runMockFraudCheck(amount: Prisma.Decimal): void {
    if (amount.gt(STEP_UP_THRESHOLD)) {
      throw new StepUpRequiredException();
    }
  }

  async transfer(
    user: JwtAccessPayload,
    dto: CreateTransferDto,
    idempotencyKey: string,
  ): Promise<TransferServiceResult> {
    if (!idempotencyKey.trim()) {
      throw new BadRequestException('x-idempotency-key header is required');
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
    this.runMockFraudCheck(amountDecimal);

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
}
