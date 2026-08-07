import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  inn?: string;

  @IsString()
  contactName!: string;

  @IsArray()
  @IsEmail({}, { each: true })
  @ArrayMinSize(1)
  contactEmails!: string[];
}
