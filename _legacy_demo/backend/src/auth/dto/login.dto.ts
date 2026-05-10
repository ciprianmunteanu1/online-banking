import { IsEmail, IsString, IsOptional, Matches } from 'class-validator';

export class LoginDto {
    @IsEmail()
    @Matches(
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        { message: 'Email must be a valid format' },
    )
    email: string;

    @IsString()
    password: string;

    @IsOptional()
    @IsString()
    mfaCode?: string;

    @IsOptional()
    @IsString()
    deviceInfo?: string;
}
