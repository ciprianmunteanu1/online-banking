import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StepUpRequiredFilter } from './filters/step-up-required.filter';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [AuthModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, StepUpRequiredFilter],
})
export class PaymentsModule {}
