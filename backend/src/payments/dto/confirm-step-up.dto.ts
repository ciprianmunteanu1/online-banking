import { IsNotEmpty, IsString, Length } from 'class-validator';

export class ConfirmStepUpDto {
  @IsString()
  @IsNotEmpty()
  challengeId: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp: string;
}
