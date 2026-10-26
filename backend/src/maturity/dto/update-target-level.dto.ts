import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { OBJECT_CATEGORY_KEYS } from '../maturity.constants';

export class UpdateTargetLevelDto {
  @IsInt()
  @Min(0)
  @Max(4)
  targetLevel!: number;

  @IsOptional()
  @IsIn(OBJECT_CATEGORY_KEYS)
  objectCategory?: string | null;
}
