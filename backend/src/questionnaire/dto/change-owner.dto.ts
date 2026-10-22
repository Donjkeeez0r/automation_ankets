import { IsNotEmpty, IsString } from 'class-validator';

export class ChangeOwnerDto {
  @IsString()
  @IsNotEmpty()
  employeeId!: string;
}
