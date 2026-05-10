import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Prisma } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { StepUpRequiredException } from './exceptions/step-up-required.exception';

describe('PaymentsService mock fraud', () => {
  it('rejects amounts strictly greater than 1000', async () => {
    const svc = new PaymentsService({
      idempotencyKey: { findUnique: async () => null }
    } as never, {
      redis: { set: async () => 'OK' }
    } as never);
    await assert.rejects(
      async () => svc.runMockFraudCheck('user1', 'idem1', new Prisma.Decimal('1000.01'), 'INTERNAL_TRANSFER', {}),
      (err: unknown) => err instanceof StepUpRequiredException,
    );
  });

  it('allows amount equal to 1000', async () => {
    const svc = new PaymentsService({
      idempotencyKey: { findUnique: async () => null }
    } as never, {
      redis: { set: async () => 'OK' }
    } as never);
    await assert.doesNotReject(async () => svc.runMockFraudCheck('user1', 'idem1', new Prisma.Decimal('1000'), 'INTERNAL_TRANSFER', {}));
  });
});
