import { levelColor } from '../../lib/maturity';
import type { MaturityReference } from '../../types/maturity';

// Радиокнопки целевого уровня 0–4 с названиями и цветами уровней.
// Тип систем и рекомендуемый минимум — в MaturityTargetPicker.
export default function TargetLevelPicker({
  reference,
  value,
  onChange,
  disabled = false,
  name = 'target-level',
}: {
  reference: MaturityReference;
  value: number;
  onChange: (level: number) => void;
  disabled?: boolean;
  name?: string;
}) {
  return (
    <div role="radiogroup" aria-label="Целевой уровень" className="space-y-1.5">
      {reference.levels.map((l) => {
        const selected = l.level === value;
        return (
          <label
            key={l.level}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
              selected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-400'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input
              type="radio"
              name={name}
              checked={selected}
              disabled={disabled}
              onChange={() => onChange(l.level)}
              className="h-4 w-4 accent-blue-600"
            />
            <span
              aria-hidden="true"
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: levelColor(l.level).hex }}
            />
            <span className="font-semibold text-gray-900">{l.level}</span>
            <span className="text-gray-700">{l.name}</span>
          </label>
        );
      })}
    </div>
  );
}
