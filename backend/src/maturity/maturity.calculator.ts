import {
  LEVEL_REQUIREMENTS,
  MATURITY_LEVELS,
  MaturityLevel,
  REQUIREMENT_KEYS,
  REQUIREMENT_TYPES,
  RequirementKey,
} from './maturity.constants';

export type RequirementValues = Record<RequirementKey, number | null>;

export interface DirectionInput {
  direction: number;
  notApplicable: boolean;
  values: RequirementValues;
}

export interface DirectionResult {
  direction: number;
  notApplicable: boolean;
  p: number | null; // итоговое значение направления (сумма D)
  level: number | null; // текущий уровень направления (0–4)
  targetLevel: number;
  meetsTarget: boolean | null;
  gaps: RequirementKey[]; // каких требований не хватает до целевого уровня
}

export interface AssessmentResult {
  directions: DirectionResult[];
  overall: number | null; // УЗИ, округлён до 2 знаков
  overallLevel: number | null;
  overallLevelName: string | null;
  applicableCount: number;
  belowTargetCount: number;
}

const WEIGHTS = Object.fromEntries(
  REQUIREMENT_TYPES.map((t) => [t.key, t.weight]),
) as Record<RequirementKey, number>;

const round = (n: number, digits: number) =>
  Math.round(n * 10 ** digits) / 10 ** digits;

// Невыбранное значение считается невыполненным (0), по аналогии с п. 24
const valueOf = (values: RequirementValues, key: RequirementKey) =>
  values[key] ?? 0;

// P = сумма D, D = вес × a (пп. 29–30)
export function calcDirectionP(values: RequirementValues): number {
  const sum = REQUIREMENT_KEYS.reduce(
    (acc, key) => acc + WEIGHTS[key] * valueOf(values, key),
    0,
  );
  return round(sum, 3);
}

function meetsLevel(values: RequirementValues, level: MaturityLevel): boolean {
  const mins = LEVEL_REQUIREMENTS[level];
  return (Object.keys(mins) as RequirementKey[]).every(
    (key) => valueOf(values, key) >= mins[key]!,
  );
}

export function calcDirectionLevel(values: RequirementValues): number {
  for (const level of [4, 3, 2, 1] as const) {
    if (meetsLevel(values, level)) return level;
  }
  return 0;
}

export function calcGaps(
  values: RequirementValues,
  targetLevel: number,
): RequirementKey[] {
  if (targetLevel < 1) return [];
  const mins = LEVEL_REQUIREMENTS[Math.min(targetLevel, 4) as MaturityLevel];
  return (Object.keys(mins) as RequirementKey[]).filter(
    (key) => valueOf(values, key) < mins[key]!,
  );
}

export function getLevelName(value: number): string {
  const level = Math.min(4, Math.max(0, Math.floor(value)));
  return MATURITY_LEVELS[level].name;
}

export function calcAssessment(
  items: DirectionInput[],
  targetLevel: number,
): AssessmentResult {
  const directions: DirectionResult[] = [...items]
    .sort((a, b) => a.direction - b.direction)
    .map((item) => {
      if (item.notApplicable) {
        return {
          direction: item.direction,
          notApplicable: true,
          p: null,
          level: null,
          targetLevel,
          meetsTarget: null,
          gaps: [],
        };
      }
      const level = calcDirectionLevel(item.values);
      return {
        direction: item.direction,
        notApplicable: false,
        p: calcDirectionP(item.values),
        level,
        targetLevel,
        meetsTarget: level >= targetLevel,
        gaps: calcGaps(item.values, targetLevel),
      };
    });

  const applicable = directions.filter((d) => !d.notApplicable);

  if (applicable.length === 0) {
    return {
      directions,
      overall: null,
      overallLevel: null,
      overallLevelName: null,
      applicableCount: 0,
      belowTargetCount: 0,
    };
  }

  // Узи — среднее уровней применимых направлений (п. 10)
  const rawOverall =
    applicable.reduce((sum, d) => sum + d.level!, 0) / applicable.length;
  const overallLevel = Math.floor(rawOverall);

  return {
    directions,
    overall: round(rawOverall, 2),
    overallLevel,
    // название — по неокруглённому Узи: округление могло бы поднять его до следующего уровня
    overallLevelName: getLevelName(rawOverall),
    applicableCount: applicable.length,
    belowTargetCount: applicable.filter((d) => !d.meetsTarget).length,
  };
}
