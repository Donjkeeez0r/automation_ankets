import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { Role } from '../../generated/prisma';

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  organization?: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
