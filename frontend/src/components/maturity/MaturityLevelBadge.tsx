import { levelColor } from '../../lib/maturity';

// Бейдж уровня зрелости: цвет по уровню (единый с диаграммой и карточкой)
export default function MaturityLevelBadge({
  level,
  name,
  compact = false,
}: {
  level: number | null | undefined;
  name?: string | null;
  // compact — только цифра (для узких колонок)
  compact?: boolean;
}) {
  if (level === null || level === undefined) {
    return <span className="text-gray-400">—</span>;
  }
  return (
    <span
      title={name ?? undefined}
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
        levelColor(level).badge
      }`}
    >
      <span className="font-semibold">{level}</span>
      {!compact && name && <span>· {name}</span>}
    </span>
  );
}
