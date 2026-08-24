import { IsInt, IsOptional, Max, Min } from 'class-validator';

// Срок на заполнение анкеты по умолчанию, если fillDays не передан
export const DEFAULT_FILL_DAYS = 30;
export const MAX_FILL_DAYS = 365;

export class CreateLinkDto {
  @IsOptional()
  @IsInt({ message: 'fillDays должен быть целым числом' })
  @Min(1, { message: 'fillDays должен быть не меньше 1' })
  @Max(MAX_FILL_DAYS, {
    message: `fillDays должен быть не больше ${MAX_FILL_DAYS}`,
  })
  fillDays?: number;
}
