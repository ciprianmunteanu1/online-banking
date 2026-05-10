import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { CardType } from '@prisma/client';

export class IssueCardDto {
  @IsUUID()
  @IsNotEmpty()
  accountId: string;

  @IsEnum(CardType)
  @IsNotEmpty()
  cardType: CardType;
}
