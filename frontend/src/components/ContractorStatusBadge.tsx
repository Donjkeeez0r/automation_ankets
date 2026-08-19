import type { ContractorStatus } from '../types';

export const CONTRACTOR_STATUS_CONFIG: Record<
  ContractorStatus,
  { label: string; icon: string; classes: string }
> = {
  GREEN:  { label: 'Рекомендован',           icon: '●', classes: 'bg-green-100 text-green-700' },
  YELLOW: { label: 'Условно рекомендован',   icon: '●', classes: 'bg-yellow-100 text-yellow-700' },
  RED:    { label: 'Не рекомендован',        icon: '●', classes: 'bg-red-100 text-red-700' },
  NONE:   { label: 'Нет статуса',            icon: '○', classes: 'bg-gray-100 text-gray-600' },
};

export const CONTRACTOR_STATUS_ORDER: ContractorStatus[] = [
  'GREEN',
  'YELLOW',
  'RED',
  'NONE',
];

export default function ContractorStatusBadge({ status }: { status: ContractorStatus }) {
  const cfg = CONTRACTOR_STATUS_CONFIG[status] ?? CONTRACTOR_STATUS_CONFIG.NONE;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.classes}`}
    >
      <span aria-hidden="true">{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}
