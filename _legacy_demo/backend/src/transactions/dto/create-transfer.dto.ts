import {
    IsString,
    IsNumber,
    IsPositive,
    IsOptional,
    MinLength,
} from 'class-validator';

export class CreateTransferDto {
    @IsString()
    sourceAccountId: string;

    @IsString()
    @MinLength(5)
    destinationIban: string;

    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    amount: number;

    @IsString()
    currency: string;

    @IsString()
    idempotencyKey: string;

    @IsOptional()
    @IsString()
    description?: string;
}

export class MerchantPaymentDto {
    @IsString()
    sourceAccountId: string;

    @IsString()
    merchantName: string;

    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    amount: number;

    @IsString()
    currency: string;

    @IsString()
    idempotencyKey: string;

    @IsOptional()
    @IsString()
    description?: string;
}
