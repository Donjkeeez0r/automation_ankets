import { IsEnum } from 'class-validator';
import { ContactorStatus } from '../../generated/prisma';

export class UpdateContractorStatusDto {
  @IsEnum(ContactorStatus)
  status!: ContactorStatus;
}
