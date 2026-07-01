import { Role } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Некорректный email!' })
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class RegisterDto extends LoginDto {
  @IsString()
  name!: string;

  @IsString()
  organization!: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
