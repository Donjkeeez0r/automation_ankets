import type { ReactNode } from 'react';
import { REQUIREMENT_KEYS, type DirectionStatus } from '../../lib/maturity';

const STATUS_VIEW: Record<DirectionStatus, { label: (filled: number) => string; classes: string }> = {
  filled: { label: () => 'Заполнено', classes: 'bg-green-100 text-green-700' },
  notApplicable: { label: () => 'Неприменимо', classes: 'bg-gray-100 text-gray-600' },
  missingReason: {
    label: () => 'Неприменимо — укажите причину',
    classes: 'bg-orange-100 text-orange-700',
  },
  partial: {
    label: (n) => `Заполнено ${n} из ${REQUIREMENT_KEYS.length}`,
    classes: 'bg-yellow-100 text-yellow-700',
  },
  empty: { label: () => 'Не заполнено', classes: 'bg-gray-100 text-gray-500' },
};

export function DirectionStatusBadge({
  status,
  filled,
}: {
  status: DirectionStatus;
  filled: number;
}) {
  const view = STATUS_VIEW[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${view.classes}`}
    >
      {view.label(filled)}
    </span>
  );
}

// Раскрывающийся блок направления: номер, название, статус и содержимое
export default function DirectionCard({
  direction,
  title,
  status,
  filled,
  expanded,
  onToggle,
  highlighted = false,
  aside,
  children,
}: {
  direction: number;
  title: string;
  status: DirectionStatus;
  filled: number;
  expanded: boolean;
  onToggle: () => void;
  // подсветка проблемного направления после неудачной отправки
  highlighted?: boolean;
  // дополнительный элемент в заголовке (например, бейдж уровня у сотрудника)
  aside?: ReactNode;
  children: ReactNode;
}) {
  const bodyId = `maturity-direction-body-${direction}`;
  return (
    <div
      id={`maturity-direction-${direction}`}
      className={`bg-white rounded-xl border overflow-hidden scroll-mt-24 transition-colors ${
        highlighted ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-200'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={bodyId}
        className="w-full flex items-start gap-3 px-4 sm:px-6 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span
          aria-hidden="true"
          className={`mt-0.5 text-xs text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
        >
          ▶
        </span>
        <span className="shrink-0 w-7 h-7 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold flex items-center justify-center">
          {direction}
        </span>
        <span className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
          <span className="flex-1 min-w-0 text-sm font-semibold text-gray-900">{title}</span>
          <span className="flex flex-wrap items-center gap-2">
            {aside}
            <DirectionStatusBadge status={status} filled={filled} />
          </span>
        </span>
      </button>
      {expanded && (
        <div id={bodyId} className="border-t border-gray-100 px-4 sm:px-6 py-5">
          {children}
        </div>
      )}
    </div>
  );
}
