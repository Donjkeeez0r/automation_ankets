import { useEffect, useState } from 'react';
import {
  getAllQuestions,
  getQuestionOverrides,
  setQuestionOverrides,
} from '../api/questionnaire';
import type { Question } from '../types';

const SECTION_LABELS: Record<string, string> = {
  general_info:  '1.1 Общие сведения',
  ib_measures:   '1.2 Меры ИБ',
  gis:           '1.3 ГИС',
  pdn:           '1.4 Персональные данные',
  remote_access: '2. Удалённый доступ',
  software_dev:  '3. Разработка ПО',
  contractors:   '4. Подрядчики',
};

const SECTION_ORDER = Object.keys(SECTION_LABELS);

function errorMessage(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
    ?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  return msg ?? fallback;
}

function RequiredToggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Обязательный"
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? 'bg-blue-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

interface QuestionOverridesDialogProps {
  open: boolean;
  questionnaireId: string;
  onClose: () => void;
}

export default function QuestionOverridesDialog({
  open,
  questionnaireId,
  onClose,
}: QuestionOverridesDialogProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  // questionId -> текущее (возможно несохранённое) значение обязательности
  const [values, setValues] = useState<Record<string, boolean>>({});
  // questionId -> значение, сохранённое на сервере (глобальное либо переопределение)
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setError('');

    Promise.all([getAllQuestions(), getQuestionOverrides(questionnaireId)])
      .then(([questionsRes, overridesRes]) => {
        if (cancelled) return;
        const overrideMap = new Map(
          overridesRes.data.map((o) => [o.questionId, o.required]),
        );
        const initial: Record<string, boolean> = {};
        for (const q of questionsRes.data) {
          initial[q.id] = overrideMap.get(q.id) ?? q.required;
        }
        setQuestions(questionsRes.data);
        setValues(initial);
        setSaved(initial);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, 'Не удалось загрузить вопросы'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, questionnaireId]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, saving, onClose]);

  if (!open) return null;

  const changedIds = Object.keys(values).filter((id) => values[id] !== saved[id]);

  const handleSave = async () => {
    if (changedIds.length === 0) {
      onClose();
      return;
    }
    setSaving(true);
    setError('');
    try {
      await setQuestionOverrides(
        questionnaireId,
        changedIds.map((questionId) => ({
          questionId,
          required: values[questionId],
        })),
      );
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Не удалось сохранить настройки'));
    } finally {
      setSaving(false);
    }
  };

  const sectionKeys = [
    ...SECTION_ORDER.filter((s) => questions.some((q) => q.section === s)),
    ...[...new Set(questions.map((q) => q.section))].filter(
      (s) => !SECTION_ORDER.includes(s),
    ),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !saving && onClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-3xl max-h-[85vh] flex flex-col bg-white rounded-xl border border-gray-200 shadow-xl"
      >
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            Обязательность вопросов для этой анкеты
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Изменения применяются только к этой анкете и не затрагивают общие
            настройки на странице «Вопросы анкеты».
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="text-sm text-gray-500">Загрузка вопросов...</div>
          ) : (
            <div className="space-y-6">
              {sectionKeys.map((sectionKey) => {
                const sectionQuestions = questions
                  .filter((q) => q.section === sectionKey)
                  .sort((a, b) => a.order - b.order);

                return (
                  <div
                    key={sectionKey}
                    className="rounded-xl border border-gray-200 overflow-hidden"
                  >
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-800">
                        {SECTION_LABELS[sectionKey] ?? sectionKey}
                      </h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {sectionQuestions.map((q) => (
                        <div key={q.id} className="px-4 py-3 flex items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800">
                              <span className="font-medium text-gray-400 mr-2">
                                {q.code}
                              </span>
                              {q.text}
                            </p>
                            {values[q.id] !== q.required && (
                              <span className="mt-1 inline-block text-[11px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                                изменено для этой анкеты
                              </span>
                            )}
                          </div>
                          <div className="shrink-0 flex items-center gap-2 pt-0.5">
                            <span className="text-xs text-gray-500">Обязательный</span>
                            <RequiredToggle
                              checked={values[q.id]}
                              disabled={saving}
                              onChange={() =>
                                setValues((prev) => ({ ...prev, [q.id]: !prev[q.id] }))
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-between gap-3">
          <span className="text-xs text-gray-500">
            {loading
              ? ''
              : changedIds.length === 0
                ? 'Несохранённых изменений нет'
                : `Несохранённых изменений: ${changedIds.length}`}
          </span>
          <div className="flex items-center gap-3">
            {error && <span className="text-sm text-red-600">{error}</span>}
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading || changedIds.length === 0}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
