import { IsNotEmpty, IsString } from 'class-validator';

export class TransferQuestionnairesDto {
  @IsString()
  @IsNotEmpty()
  toUserId!: string;
}
