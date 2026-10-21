import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  DIRECTIONS,
  REQUIREMENT_TYPES,
  RequirementKey,
} from '../maturity.constants';

const allowed = (key: RequirementKey) =>
  REQUIREMENT_TYPES.find((t) => t.key === key)!.options.map((o) => o.value);

export class MaturityItemDto {
  @IsInt()
  @Min(1)
  @Max(DIRECTIONS.length)
  direction!: number;

  @IsOptional()
  @IsBoolean()
  notApplicable?: boolean;

  @IsOptional()
  @IsIn(allowed('documentation'))
  documentation?: number | null;

  @IsOptional()
  @IsIn(allowed('execution'))
  execution?: number | null;

  @IsOptional()
  @IsIn(allowed('tools'))
  tools?: number | null;

  @IsOptional()
  @IsIn(allowed('qualification'))
  qualification?: number | null;

  @IsOptional()
  @IsIn(allowed('control'))
  control?: number | null;

  @IsOptional()
  @IsIn(allowed('training'))
  training?: number | null;

  @IsOptional()
  @IsIn(allowed('externalAudit'))
  externalAudit?: number | null;

  @IsOptional()
  @IsIn(allowed('improvement'))
  improvement?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string | null;
}

export class SaveMaturityDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(DIRECTIONS.length)
  @ValidateNested({ each: true })
  @Type(() => MaturityItemDto)
  items!: MaturityItemDto[];
}
