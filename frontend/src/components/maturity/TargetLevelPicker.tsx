import { levelColor } from '../../lib/maturity';
import type { MaturityReference } from '../../types/maturity';

// Выбор целевого уровня 0–4 с названиями уровней и подсказкой
// о рекомендуемом минимуме из справочника (пункт 11 методики)
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
    <div>
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

      {reference.recommendedTargetLevels.length > 0 && (
        <div className="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-600">
          <div className="font-medium text-gray-700 mb-1">
            Рекомендуемый минимум, если подрядчик работает с системами:
          </div>
          <ul className="space-y-1">
            {reference.recommendedTargetLevels.map((r) => (
              <li key={r.label} className="flex gap-2">
                <span className="shrink-0 font-semibold text-gray-800">
                  уровень {r.level}
                </span>
                <span>— {r.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
