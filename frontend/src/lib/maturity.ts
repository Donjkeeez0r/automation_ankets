import { useEffect, useState } from 'react';
import { getMaturityReference } from '../api/maturity';
import type {
  MaturityItem,
  MaturityItemInput,
  MaturityReference,
  MaturitySubmitError,
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

// Показатель P направления — всегда три знака после запятой: 0,500
export const formatP = (value: number | null | undefined): string =>
  value === null || value === undefined
    ? '—'
    : value.toLocaleString('ru-RU', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

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

// ── Неполная оценка ──────────────────────────────────────────────────────────
export interface MaturityProblems {
  incomplete: number[];
  missingReason: number[];
}

// 400 с { incompleteDirections, missingReasonDirections }; иначе null
export function maturityProblems(err: unknown): MaturityProblems | null {
  const data = (err as { response?: { data?: Partial<MaturitySubmitError> } })?.response?.data;
  const toNumbers = (v: unknown) =>
    Array.isArray(v) ? v.filter((n): n is number => typeof n === 'number') : [];
  const incomplete = toNumbers(data?.incompleteDirections);
  const missingReason = toNumbers(data?.missingReasonDirections);
  if (incomplete.length === 0 && missingReason.length === 0) return null;
  return { incomplete, missingReason };
}

// Незаполненные направления по черновикам — те же правила, что у бэкенда
export function draftProblems(
  directions: number[],
  draftOf: (direction: number) => MaturityDraft,
): MaturityProblems | null {
  const incomplete: number[] = [];
  const missingReason: number[] = [];
  for (const d of directions) {
    const status = directionStatus(draftOf(d));
    if (status === 'missingReason') missingReason.push(d);
    else if (status === 'partial' || status === 'empty') incomplete.push(d);
  }
  if (incomplete.length === 0 && missingReason.length === 0) return null;
  return { incomplete, missingReason };
}

// Все проблемные направления по возрастанию номера
export const problemDirections = (p: MaturityProblems): number[] =>
  [...new Set([...p.incomplete, ...p.missingReason])].sort((a, b) => a - b);

// «не выбраны все оценки в направлениях № 1, 2; не указана причина … № 5»
export function problemsText(p: MaturityProblems): string {
  const parts: string[] = [];
  if (p.incomplete.length > 0) {
    parts.push(`не выбраны все оценки в направлениях № ${p.incomplete.join(', ')}`);
  }
  if (p.missingReason.length > 0) {
    parts.push(
      `не указана причина неприменимости в направлениях № ${p.missingReason.join(', ')}`,
    );
  }
  return parts.join('; ');
}

// Раскрытые блоки отрисуются в следующем кадре — тогда и прокручиваем к первому
export function scrollToDirection(direction: number) {
  window.requestAnimationFrame(() =>
    document
      .getElementById(`maturity-direction-${direction}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
  );
}

// ── Число направлений в тексте ───────────────────────────────────────────────
// «21 направление», «22 направления», «25 направлений»
export function directionsCountText(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} направление`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} направления`;
  return `${n} направлений`;
}

// «по 21 направлению», «по 25 направлениям»
export const byDirectionsCountText = (n: number): string =>
  `по ${n} ${n % 10 === 1 && n % 100 !== 11 ? 'направлению' : 'направлениям'}`;

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
