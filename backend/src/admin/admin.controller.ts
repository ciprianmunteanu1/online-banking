import { Controller, Get, Patch, Param, Req, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MfaVerifiedGuard } from '../auth/guards/mfa-verified.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Request } from 'express';
import { KycStatus } from '@prisma/client';
import type { JwtAccessPayload } from '../auth/auth.types';

@Controller('admin/customers')
@UseGuards(JwtAuthGuard, MfaVerifiedGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  getCustomers() {
    return this.adminService.getCustomers();
  }

  @Patch(':id/verify')
  verifyCustomer(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const user = req.user as JwtAccessPayload;
    return this.adminService.updateKycStatus(user.sub, id, KycStatus.VERIFIED);
  }

  @Patch(':id/reject')
  rejectCustomer(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const user = req.user as JwtAccessPayload;
    return this.adminService.updateKycStatus(user.sub, id, KycStatus.REJECTED);
  }
}
