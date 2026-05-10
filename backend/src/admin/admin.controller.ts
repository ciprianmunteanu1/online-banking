import { Controller, Get, Patch, Param, Req, UseGuards, ParseUUIDPipe, Post, Body } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminCreditDto } from './dto/admin-credit.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MfaVerifiedGuard } from '../auth/guards/mfa-verified.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Request } from 'express';
import { KycStatus } from '@prisma/client';
import type { JwtAccessPayload } from '../auth/auth.types';

@Controller('admin')
@UseGuards(JwtAuthGuard, MfaVerifiedGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('customers')
  getCustomers() {
    return this.adminService.getCustomers();
  }

  @Patch('customers/:id/verify')
  verifyCustomer(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const user = req.user as JwtAccessPayload;
    return this.adminService.updateKycStatus(user.sub, id, KycStatus.VERIFIED);
  }

  @Patch('customers/:id/reject')
  rejectCustomer(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const user = req.user as JwtAccessPayload;
    return this.adminService.updateKycStatus(user.sub, id, KycStatus.REJECTED);
  }

  @Post('accounts/:accountId/credit')
  creditAccount(
    @Req() req: Request,
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Body() dto: AdminCreditDto,
  ) {
    const user = req.user as JwtAccessPayload;
    return this.adminService.creditAccount(user.sub, accountId, dto);
  }
}
