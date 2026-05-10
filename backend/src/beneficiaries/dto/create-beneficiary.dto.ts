import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBeneficiaryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(34)
  iban!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  alias?: string;
}
