import { IsEmail, IsEnum, IsString } from 'class-validator';
import { Role } from '../../generated/prisma';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  name!: string;

  @IsString()
  organization!: string;

  @IsEnum(Role)
  role!: Role;
}
