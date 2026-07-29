import { IsString } from 'class-validator';

export class CreateQuestionnaireDto {
  @IsString()
  companyId!: string;
}
