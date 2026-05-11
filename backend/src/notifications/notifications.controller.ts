import { Controller, Get, Patch, Param, UseGuards, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MfaVerifiedGuard } from '../auth/guards/mfa-verified.guard';
import type { JwtAccessPayload } from '../auth/auth.types';

@UseGuards(JwtAuthGuard, MfaVerifiedGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(@Req() req: { user: JwtAccessPayload }) {
    return this.notificationsService.findAllForUser(req.user.sub);
  }

  @Patch('read-all')
  async markAllAsRead(@Req() req: { user: JwtAccessPayload }) {
    await this.notificationsService.markAllAsRead(req.user.sub);
    return { success: true };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: { user: JwtAccessPayload }) {
    await this.notificationsService.markAsRead(id, req.user.sub);
    return { success: true };
  }
}
