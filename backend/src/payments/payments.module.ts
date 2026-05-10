import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RedisModule } from '../redis/redis.module';
import { StepUpRequiredFilter } from './filters/step-up-required.filter';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [AuthModule, RedisModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, StepUpRequiredFilter],
})
export class PaymentsModule {}
