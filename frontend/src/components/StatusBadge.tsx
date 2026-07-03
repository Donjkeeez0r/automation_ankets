import type { Status } from '../types';

const STATUS_CONFIG: Record<Status, { label: string; classes: string }> = {
  DRAFT:      { label: 'Черновик',       classes: 'bg-gray-100 text-gray-700' },
  SUBMITTED:  { label: 'Отправлена',     classes: 'bg-blue-100 text-blue-700' },
  IN_REVIEW:  { label: 'На проверке',    classes: 'bg-yellow-100 text-yellow-700' },
  APPROVED:   { label: 'Одобрена',       classes: 'bg-green-100 text-green-700' },
  DECLINED:   { label: 'Отклонена',      classes: 'bg-red-100 text-red-700' },
  REVISION:   { label: 'На доработке',   classes: 'bg-orange-100 text-orange-700' },
};

export default function StatusBadge({ status }: { status: Status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.classes}`}>
      {cfg.label}
    </span>
  );
}
