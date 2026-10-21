import { IsInt, Max, Min } from 'class-validator';

export class UpdateTargetLevelDto {
  @IsInt()
  @Min(0)
  @Max(4)
  targetLevel!: number;
}
