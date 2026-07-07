import type { Status } from '../types';

const STATUS_CONFIG: Record<Status, { label: string; icon: string; classes: string }> = {
  DRAFT:      { label: 'Не заполнена', icon: '○', classes: 'bg-gray-100 text-gray-700' },
  SUBMITTED:  { label: 'На проверке',  icon: '⏳', classes: 'bg-yellow-100 text-yellow-700' },
  IN_REVIEW:  { label: 'На проверке',  icon: '⏳', classes: 'bg-yellow-100 text-yellow-700' },
  APPROVED:   { label: 'Прошёл',       icon: '✓', classes: 'bg-green-100 text-green-700' },
  DECLINED:   { label: 'Не прошёл',    icon: '✗', classes: 'bg-red-100 text-red-700' },
  REVISION:   { label: 'На доработке', icon: '↩', classes: 'bg-orange-100 text-orange-700' },
};

export default function StatusBadge({ status }: { status: Status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.classes}`}>
      <span aria-hidden="true">{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}
