import { Status } from '../../generated/prisma';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateStatusDto {
  @IsEnum(Status)
  status!: Status;

  @IsString()
  @IsOptional()
  comment?: string;
}
