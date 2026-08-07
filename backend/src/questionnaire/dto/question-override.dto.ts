import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsString, ValidateNested } from 'class-validator';

class OverrideItemDto {
  @IsString()
  questionId!: string;

  @IsBoolean()
  required!: boolean;
}

export class SetOverridesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OverrideItemDto)
  overrides!: OverrideItemDto[];
}
