import { IsOptional, IsString } from 'class-validator';

export class AnswerDto {
  @IsString()
  questionId!: string;

  @IsString()
  value!: string;

  @IsOptional()
  @IsString()
  additionalValue?: string;
}
