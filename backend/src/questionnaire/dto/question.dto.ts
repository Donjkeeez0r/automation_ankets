import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  code!: string;

  @IsString()
  section!: string;

  @IsString()
  text!: string;

  @IsString()
  type!: string;

  @IsInt()
  @Min(1)
  order!: number;
}

export class UpdateQuestionDto {
  @IsString()
  @IsOptional()
  text?: string;

  @IsString()
  @IsOptional()
  section?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  order?: number;
}
