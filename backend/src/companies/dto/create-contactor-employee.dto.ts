import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateContactorEmployeeDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsEmail()
  @IsOptional()
  email?: string;
}
