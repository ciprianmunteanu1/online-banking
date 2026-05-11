import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MfaVerifiedGuard } from '../auth/guards/mfa-verified.guard';
import { MerchantsService } from './merchants.service';

@Controller('merchants')
@UseGuards(JwtAuthGuard, MfaVerifiedGuard)
export class MerchantsController {
  constructor(private readonly merchants: MerchantsService) {}

  @Get()
  findActive() {
    return this.merchants.findActive();
  }
}
