// Типы оценки уровня зрелости по методике ФСТЭК (questionnaire.type = MATURITY).
// Тексты направлений, видов требований, вариантов и уровней приходят
// из справочника GET /maturity/reference — во фронте они не хардкодятся.

export type QuestionnaireType = 'SECURITY' | 'MATURITY';

export type RequirementKey =
  | 'documentation'
  | 'execution'
  | 'tools'
  | 'qualification'
  | 'control'
  | 'training'
  | 'externalAudit'
  | 'improvement';

export interface MaturityOption {
  value: number;
  label: string;
}

export interface MaturityRequirementType {
  key: RequirementKey;
  title: string;
  description: string;
  weight: number;
  options: MaturityOption[];
}

export interface MaturityDirectionRef {
  id: number;
  title: string;
}

export interface MaturityLevelRef {
  level: number;
  name: string;
}

export interface RecommendedTargetLevel {
  label: string;
  level: number;
}

export interface MaturityReference {
  directions: MaturityDirectionRef[];
  requirementTypes: MaturityRequirementType[];
  levels: MaturityLevelRef[];
  recommendedTargetLevels: RecommendedTargetLevel[];
}

// Значения 8 видов требований одного направления; null — не выбрано
export type MaturityValues = Record<RequirementKey, number | null>;

// Строка maturityItems анкеты (21 шт., отсортированы по direction)
export interface MaturityItem extends MaturityValues {
  id: string;
  direction: number;
  notApplicable: boolean;
  comment: string | null;
}

// Элемент тела POST /links/:token/maturity и PATCH /questionnaire/:id/maturity.
// Отсутствующее поле не меняется, null — очищает.
export type MaturityItemInput = {
  direction: number;
  notApplicable?: boolean;
  comment?: string | null;
} & Partial<MaturityValues>;

export interface MaturityDirectionResult {
  direction: number;
  title: string;
  notApplicable: boolean;
  p: number | null;
  level: number | null;
  levelName: string | null;
  targetLevel: number;
  meetsTarget: boolean | null;
  gaps: RequirementKey[];
  gapTitles: string[];
}

export interface MaturityResult {
  targetLevel: number;
  targetLevelName: string;
  overall: number | null;
  overallLevel: number | null;
  overallLevelName: string | null;
  applicableCount: number;
  belowTargetCount: number;
  directions: MaturityDirectionResult[];
}

// Тело 400 при отправке неполной оценки
export interface MaturitySubmitError {
  message: string;
  incompleteDirections: number[];
  missingReasonDirections: number[];
}
