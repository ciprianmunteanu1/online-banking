import {
  Body,
  Controller,
  Headers,
  Post,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { JwtAccessPayload } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MfaVerifiedGuard } from '../auth/guards/mfa-verified.guard';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TransferToBeneficiaryDto } from './dto/transfer-to-beneficiary.dto';
import { StepUpRequiredFilter } from './filters/step-up-required.filter';
import { PaymentsService } from './payments.service';

@Controller('payments')
@UseFilters(StepUpRequiredFilter)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('transfer')
  @UseGuards(JwtAuthGuard, MfaVerifiedGuard)
  async transfer(
    @Req() req: Request,
    @Body() dto: CreateTransferDto,
    @Headers('x-idempotency-key') idempotencyKey: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user as JwtAccessPayload;
    const result = await this.payments.transfer(user, dto, idempotencyKey ?? '');
    res.status(result.httpStatus);
    return result.body;
  }

  @Post('transfer-to-beneficiary')
  @UseGuards(JwtAuthGuard, MfaVerifiedGuard)
  async transferToBeneficiary(
    @Req() req: Request,
    @Body() dto: TransferToBeneficiaryDto,
    @Headers('x-idempotency-key') idempotencyKey: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user as JwtAccessPayload;
    const result = await this.payments.transferToBeneficiary(user, dto, idempotencyKey ?? '');
    res.status(result.httpStatus);
    return result.body;
  }
}
