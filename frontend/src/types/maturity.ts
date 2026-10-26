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
  // характеристика уровня (таблица 1 методики)
  description: string;
}

// Тип систем, с которыми работает подрядчик, и рекомендуемый
// минимальный целевой уровень для него (п. 11 методики)
export interface MaturityObjectCategory {
  key: string;
  label: string;
  recommendedLevel: number;
}

export interface MaturityReference {
  directions: MaturityDirectionRef[];
  requirementTypes: MaturityRequirementType[];
  levels: MaturityLevelRef[];
  objectCategories: MaturityObjectCategory[];
}

// Параметры оценки: целевой уровень и тип систем (null — «не указано»)
export interface MaturityTarget {
  targetLevel: number;
  objectCategory: string | null;
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
  // комментарий подрядчика; у неприменимого направления — причина
  comment: string | null;
}

export interface MaturityResult {
  targetLevel: number;
  targetLevelName: string;
  overall: number | null;
  overallLevel: number | null;
  overallLevelName: string | null;
  // характеристика общего уровня
  overallLevelDescription: string | null;
  // выбранный тип систем; null — не указан
  objectCategory: string | null;
  objectCategoryLabel: string | null;
  // рекомендуемый минимум для выбранного типа систем
  recommendedLevel: number | null;
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
