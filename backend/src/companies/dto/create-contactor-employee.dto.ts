import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateContactorEmployeeDto {
  @IsString()
  name!: string;

  @IsEmail()
  @IsOptional()
  email?: string;
}
