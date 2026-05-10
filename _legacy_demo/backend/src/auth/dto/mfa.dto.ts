import { IsString } from 'class-validator';

export class VerifyMfaDto {
    @IsString()
    code: string;
}

export class EnableMfaDto {
    @IsString()
    code: string;
}
