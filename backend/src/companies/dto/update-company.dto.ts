import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateCompanyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  inn?: string;

  @IsString()
  @IsOptional()
  contactName?: string;

  @IsArray()
  @IsEmail({}, { each: true })
  @ArrayMinSize(1)
  @IsOptional()
  contactEmails?: string[];
}
