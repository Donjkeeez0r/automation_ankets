import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { AnswerDto } from './answer.dto';

export class SubmitAnswerDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers!: AnswerDto[];
}
