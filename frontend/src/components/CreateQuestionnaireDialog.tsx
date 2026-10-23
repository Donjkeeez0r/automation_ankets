import { useEffect, useState } from 'react';
import TargetLevelPicker from './maturity/TargetLevelPicker';
import { useMaturityReference } from '../lib/maturity';
import type { CreateQuestionnaireOptions } from '../api/questionnaire';
import type { QuestionnaireType } from '../types';

// Целевой уровень по умолчанию для новой оценки зрелости
const DEFAULT_TARGET_LEVEL = 1;

const TYPE_OPTIONS: { value: QuestionnaireType; title: string; description: string }[] = [
  {
    value: 'SECURITY',
    title: 'Анкета ИБ',
    description: 'Анкета по информационной безопасности: ответы на вопросы, скоринг и рекомендации.',
  },
  {
    value: 'MATURITY',
    title: 'Оценка уровня зрелости',
    description:
      'Оценка по методике ФСТЭК: 21 направление, уровень зрелости 0–4 и недостатки до целевого уровня.',
  },
];

export default function CreateQuestionnaireDialog({
  open,
  busy,
  error,
  onCreate,
  onCancel,
}: {
  open: boolean;
  busy: boolean;
  error: string;
  onCreate: (options: CreateQuestionnaireOptions) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<QuestionnaireType>('SECURITY');
  const [targetLevel, setTargetLevel] = useState(DEFAULT_TARGET_LEVEL);
  const isMaturity = type === 'MATURITY';
  const { reference, error: referenceError, retry } = useMaturityReference(open && isMaturity);

  // каждое открытие начинается с настроек по умолчанию
  useEffect(() => {
    if (!open) return;
    setType('SECURITY');
    setTargetLevel(DEFAULT_TARGET_LEVEL);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const canCreate = !busy && (!isMaturity || reference !== null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => !busy && onCancel()} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-questionnaire-title"
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-xl p-5"
      >
        <h2 id="create-questionnaire-title" className="text-base font-semibold text-gray-900">
          Создать анкету
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Анкета закрепится за вами. Ссылку на заполнение можно будет отправить после создания.
        </p>

        <div role="radiogroup" aria-label="Тип анкеты" className="mt-4 grid gap-2 sm:grid-cols-2">
          {TYPE_OPTIONS.map((opt) => {
            const selected = opt.value === type;
            return (
              <label
                key={opt.value}
                className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-400'
                }`}
              >
                <input
                  type="radio"
                  name="questionnaire-type"
                  checked={selected}
                  onChange={() => setType(opt.value)}
                  className="mt-0.5 h-4 w-4 accent-blue-600 shrink-0"
                />
                <span>
                  <span className="block text-sm font-medium text-gray-900">{opt.title}</span>
                  <span className="block mt-0.5 text-xs text-gray-500">{opt.description}</span>
                </span>
              </label>
            );
          })}
        </div>

        {isMaturity && (
          <div className="mt-5">
            <div className="text-xs font-medium text-gray-700 mb-2">Целевой уровень зрелости</div>
            {referenceError ? (
              <div className="text-sm text-red-600">
                {referenceError}{' '}
                <button type="button" onClick={retry} className="underline hover:no-underline">
                  Повторить
                </button>
              </div>
            ) : !reference ? (
              <div className="text-sm text-gray-500">Загрузка уровней...</div>
            ) : (
              <TargetLevelPicker
                reference={reference}
                value={targetLevel}
                onChange={setTargetLevel}
                disabled={busy}
              />
            )}
          </div>
        )}

        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() =>
              onCreate(isMaturity ? { type: 'MATURITY', targetLevel } : { type: 'SECURITY' })
            }
            disabled={!canCreate}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {busy ? 'Создание...' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  );
}
