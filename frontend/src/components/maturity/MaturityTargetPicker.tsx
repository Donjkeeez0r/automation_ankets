import { useId } from 'react';
import TargetLevelPicker from './TargetLevelPicker';
import type { MaturityReference, MaturityTarget } from '../../types/maturity';

// Значение пункта «Не указано» в выпадающем списке (objectCategory = null)
const NO_CATEGORY = '';

// Параметры оценки зрелости: тип систем, с которыми работает подрядчик,
// и целевой уровень. Выбор типа ставит рекомендуемый минимум (п. 11 методики),
// после чего уровень можно поправить вручную. Используется при создании
// оценки и в окне «Изменить» на странице результата.
export default function MaturityTargetPicker({
  reference,
  value,
  onChange,
  disabled = false,
  name = 'target-level',
}: {
  reference: MaturityReference;
  value: MaturityTarget;
  onChange: (value: MaturityTarget) => void;
  disabled?: boolean;
  // имя группы радиокнопок — разное, если на странице несколько выборов
  name?: string;
}) {
  const selectId = useId();
  const hintId = useId();
  const category =
    reference.objectCategories.find((c) => c.key === value.objectCategory) ?? null;
  const belowRecommended = category !== null && value.targetLevel < category.recommendedLevel;

  const selectCategory = (key: string) => {
    const next = reference.objectCategories.find((c) => c.key === key) ?? null;
    onChange(
      next
        ? { objectCategory: next.key, targetLevel: next.recommendedLevel }
        : { objectCategory: null, targetLevel: value.targetLevel },
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={selectId} className="block text-xs font-medium text-gray-700">
          С какими системами работает подрядчик
        </label>
        <p id={hintId} className="mt-0.5 mb-2 text-xs text-gray-500">
          От типа систем зависит рекомендуемый минимальный целевой уровень (п. 11 методики).
          Если подрядчик работает с несколькими типами систем, выберите самый строгий.
        </p>
        <select
          id={selectId}
          value={category?.key ?? NO_CATEGORY}
          onChange={(e) => selectCategory(e.target.value)}
          disabled={disabled}
          aria-describedby={hintId}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <option value={NO_CATEGORY}>Не указано (задать уровень вручную)</option>
          {reference.objectCategories.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label} — целевой уровень не ниже {c.recommendedLevel}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="text-xs font-medium text-gray-700 mb-2">Целевой уровень зрелости</div>
        <TargetLevelPicker
          reference={reference}
          value={value.targetLevel}
          onChange={(targetLevel) => onChange({ ...value, targetLevel })}
          disabled={disabled}
          name={name}
        />
        {category && belowRecommended && (
          <div
            role="status"
            className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800"
          >
            Ниже рекомендуемого минимума для {category.label} (не ниже{' '}
            {category.recommendedLevel}). Методика допускает установку своего уровня, но
            рекомендует не ниже указанного.
          </div>
        )}
      </div>
    </div>
  );
}
