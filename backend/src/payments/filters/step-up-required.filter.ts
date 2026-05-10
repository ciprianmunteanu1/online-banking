import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  Injectable,
} from '@nestjs/common';
import type { Response } from 'express';
import { StepUpRequiredException } from '../exceptions/step-up-required.exception';

@Catch(StepUpRequiredException)
@Injectable()
export class StepUpRequiredFilter implements ExceptionFilter {
  catch(_exception: StepUpRequiredException, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    res.status(403).json({
      code: 'STEP_UP_REQUIRED',
      message: 'Step-up authentication required for transfers over 1000.',
    });
  }
}
