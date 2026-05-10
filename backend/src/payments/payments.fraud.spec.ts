import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Prisma } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { StepUpRequiredException } from './exceptions/step-up-required.exception';

describe('PaymentsService mock fraud', () => {
  it('rejects amounts strictly greater than 1000', () => {
    const svc = new PaymentsService({} as never);
    assert.throws(
      () => svc.runMockFraudCheck(new Prisma.Decimal('1000.01')),
      (err: unknown) => err instanceof StepUpRequiredException,
    );
  });

  it('allows amount equal to 1000', () => {
    const svc = new PaymentsService({} as never);
    assert.doesNotThrow(() => svc.runMockFraudCheck(new Prisma.Decimal('1000')));
  });
});
