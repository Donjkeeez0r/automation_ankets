import { useEffect, useState } from 'react';
import { getMaturityReference } from '../api/maturity';
import type {
  MaturityItem,
  MaturityItemInput,
  MaturityReference,
  MaturityValues,
  RequirementKey,
} from '../types/maturity';

// Ключи 8 видов требований — часть контракта API (не тексты), порядок как в методике
export const REQUIREMENT_KEYS: RequirementKey[] = [
  'documentation',
  'execution',
  'tools',
  'qualification',
  'control',
  'training',
  'externalAudit',
  'improvement',
];

export const MATURITY_LEVEL_VALUES = [0, 1, 2, 3, 4] as const;

// ── Цвета уровней: одни и те же в бейджах, карточке и диаграмме ──────────────
// 0 — красный, 1 — оранжевый, 2 — жёлтый, 3 — светло-зелёный, 4 — зелёный.
interface LevelColor {
  badge: string; // классы бейджа
  soft: string; // фон/рамка карточки
  text: string; // крупная цифра
  hex: string; // точка на диаграмме
}

const LEVEL_COLORS: LevelColor[] = [
  { badge: 'bg-red-100 text-red-700', soft: 'bg-red-50 border-red-200', text: 'text-red-700', hex: '#ef4444' },
  { badge: 'bg-orange-100 text-orange-700', soft: 'bg-orange-50 border-orange-200', text: 'text-orange-700', hex: '#f97316' },
  { badge: 'bg-yellow-100 text-yellow-800', soft: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700', hex: '#eab308' },
  { badge: 'bg-lime-100 text-lime-800', soft: 'bg-lime-50 border-lime-200', text: 'text-lime-700', hex: '#84cc16' },
  { badge: 'bg-green-100 text-green-700', soft: 'bg-green-50 border-green-200', text: 'text-green-700', hex: '#16a34a' },
];

const NEUTRAL_COLOR: LevelColor = {
  badge: 'bg-gray-100 text-gray-500',
  soft: 'bg-gray-50 border-gray-200',
  text: 'text-gray-500',
  hex: '#9ca3af',
};

export const levelColor = (level: number | null | undefined): LevelColor =>
  level === null || level === undefined
    ? NEUTRAL_COLOR
    : LEVEL_COLORS[Math.min(4, Math.max(0, Math.floor(level)))];

export const levelName = (
  reference: MaturityReference | null,
  level: number | null | undefined,
): string =>
  level === null || level === undefined
    ? '—'
    : (reference?.levels.find((l) => l.level === level)?.name ?? String(level));

// Числа в русской записи: 0,555
export const formatNumber = (value: number | null | undefined): string =>
  value === null || value === undefined ? '—' : String(value).replace('.', ',');

// ── Черновик направления (форма подрядчика и правка сотрудником) ─────────────
export interface MaturityDraft extends MaturityValues {
  notApplicable: boolean;
  comment: string;
}

export type MaturityDrafts = Record<number, MaturityDraft>;

const emptyValues = (): MaturityValues =>
  Object.fromEntries(REQUIREMENT_KEYS.map((k) => [k, null])) as MaturityValues;

export const emptyDraft = (): MaturityDraft => ({
  ...emptyValues(),
  notApplicable: false,
  comment: '',
});

export function toDrafts(items: MaturityItem[] | undefined): MaturityDrafts {
  const drafts: MaturityDrafts = {};
  for (const item of items ?? []) {
    const values = Object.fromEntries(
      REQUIREMENT_KEYS.map((k) => [k, item[k]]),
    ) as MaturityValues;
    drafts[item.direction] = {
      ...values,
      notApplicable: item.notApplicable,
      comment: item.comment ?? '',
    };
  }
  return drafts;
}

// Полное состояние направления для отправки; пустой комментарий — null
export function draftToInput(direction: number, draft: MaturityDraft): MaturityItemInput {
  const input: MaturityItemInput = {
    direction,
    notApplicable: draft.notApplicable,
    comment: draft.comment.trim() ? draft.comment : null,
  };
  for (const k of REQUIREMENT_KEYS) input[k] = draft[k];
  return input;
}

export const isSameDraft = (a: MaturityDraft, b: MaturityDraft): boolean =>
  a.notApplicable === b.notApplicable &&
  a.comment.trim() === b.comment.trim() &&
  REQUIREMENT_KEYS.every((k) => a[k] === b[k]);

export const filledCount = (draft: MaturityDraft): number =>
  REQUIREMENT_KEYS.filter((k) => draft[k] !== null).length;

export type DirectionStatus =
  | 'filled' // все 8 оценок выбраны
  | 'notApplicable' // неприменимо, причина указана
  | 'missingReason' // неприменимо, но без причины
  | 'partial' // выбрана часть оценок
  | 'empty';

export function directionStatus(draft: MaturityDraft): DirectionStatus {
  if (draft.notApplicable) return draft.comment.trim() ? 'notApplicable' : 'missingReason';
  const n = filledCount(draft);
  if (n === REQUIREMENT_KEYS.length) return 'filled';
  return n === 0 ? 'empty' : 'partial';
}

// Направление считается заполненным: все оценки выбраны или «неприменимо» с причиной
export const isDirectionDone = (draft: MaturityDraft): boolean => {
  const s = directionStatus(draft);
  return s === 'filled' || s === 'notApplicable';
};

// ── Справочник ───────────────────────────────────────────────────────────────
export function useMaturityReference(enabled = true) {
  const [reference, setReference] = useState<MaturityReference | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setError('');
    getMaturityReference()
      .then((data) => alive && setReference(data))
      .catch(() => alive && setError('Не удалось загрузить справочник методики'));
    return () => {
      alive = false;
    };
  }, [enabled, attempt]);

  return {
    reference,
    error,
    loading: enabled && !reference && !error,
    retry: () => setAttempt((n) => n + 1),
  };
}

// Сообщение из ответа бэкенда (строка или массив строк class-validator)
export function apiErrorMessage(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response
    ?.data?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  return msg ?? fallback;
}
