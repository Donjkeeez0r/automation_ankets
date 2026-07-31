import { Status } from '../../generated/prisma';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateStatusDto {
  @IsEnum(Status)
  status!: Status;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsDateString()
  @IsOptional()
  deadlineAt?: string;
}
