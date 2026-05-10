import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { JwtAccessPayload } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MfaVerifiedGuard } from '../auth/guards/mfa-verified.guard';
import { BeneficiariesService } from './beneficiaries.service';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';

@Controller('beneficiaries')
@UseGuards(JwtAuthGuard, MfaVerifiedGuard)
export class BeneficiariesController {
  constructor(private readonly svc: BeneficiariesService) {}

  @Get()
  findAll(@Req() req: Request) {
    const user = req.user as JwtAccessPayload;
    return this.svc.findByUser(user.sub);
  }

  @Post()
  async create(
    @Req() req: Request,
    @Body() dto: CreateBeneficiaryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user as JwtAccessPayload;
    const result = await this.svc.create(user.sub, dto);
    res.status(result.httpStatus);
    return result.body;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const user = req.user as JwtAccessPayload;
    return this.svc.remove(user.sub, id);
  }
}
