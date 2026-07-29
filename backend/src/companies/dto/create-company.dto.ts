import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  inn?: string;

  @IsString()
  contactName!: string;

  @IsEmail()
  contactEmail!: string;
}
