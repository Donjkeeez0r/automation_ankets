import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { QuestionnaireType } from '../../generated/prisma';

export class CreateQuestionnaireDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsEnum(QuestionnaireType)
  type?: QuestionnaireType;

  // Обязательно для зрелости
  @ValidateIf(
    (o: CreateQuestionnaireDto) => o.type === QuestionnaireType.MATURITY,
  )
  @IsInt()
  @Min(0)
  @Max(4)
  targetLevel?: number;
}
