import { Transform, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'maxTwoDecimalPlaces', async: false })
class MaxTwoDecimalPlacesConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return false;
    }
    const s = value.toString();
    const parts = s.split('.');
    if (parts.length === 1) {
      return true;
    }
    return parts[1].length <= 2;
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must have at most 2 decimal places`;
  }
}

export class CreateTransferDto {
  @IsUUID('4')
  sourceAccountId!: string;

  @IsUUID('4')
  destinationAccountId!: string;

  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.01)
  @Max(1e12)
  @Validate(MaxTwoDecimalPlacesConstraint)
  amount!: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? 'RON'
      : String(value).trim(),
  )
  @IsString()
  @IsNotEmpty()
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
