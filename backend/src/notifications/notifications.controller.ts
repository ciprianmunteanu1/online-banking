import { Controller, Get, Patch, Param, UseGuards, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MfaVerifiedGuard } from '../auth/guards/mfa-verified.guard';

@UseGuards(JwtAuthGuard, MfaVerifiedGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(@Req() req: any) {
    return this.notificationsService.findAllForUser(req.user.userId);
  }

  @Patch('read-all')
  async markAllAsRead(@Req() req: any) {
    await this.notificationsService.markAllAsRead(req.user.userId);
    return { success: true };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    await this.notificationsService.markAsRead(id, req.user.userId);
    return { success: true };
  }
}
