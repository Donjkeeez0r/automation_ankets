import { useEffect, useState } from 'react';
import { getAllQuestions, updateQuestionRequired } from '../../api/questionnaire';
import type { Question } from '../../types';

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

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  // questionId -> состояние сохранения переключателя
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});
  const [errorIds, setErrorIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getAllQuestions()
      .then(({ data }) => setQuestions(data))
      .catch(() => setLoadError('Не удалось загрузить вопросы'))
      .finally(() => setLoading(false));
  }, []);

  const toggleRequired = async (question: Question) => {
    const next = !question.required;
    setSavingIds((prev) => ({ ...prev, [question.id]: true }));
    setErrorIds((prev) => ({ ...prev, [question.id]: false }));
    // оптимистично — откатываем при ошибке
    setQuestions((prev) =>
      prev.map((q) => (q.id === question.id ? { ...q, required: next } : q)),
    );
    try {
      await updateQuestionRequired(question.id, next);
    } catch {
      setQuestions((prev) =>
        prev.map((q) => (q.id === question.id ? { ...q, required: !next } : q)),
      );
      setErrorIds((prev) => ({ ...prev, [question.id]: true }));
    } finally {
      setSavingIds((prev) => ({ ...prev, [question.id]: false }));
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Загрузка...</div>;
  }

  const sectionKeys = [
    ...SECTION_ORDER.filter((s) => questions.some((q) => q.section === s)),
    ...[...new Set(questions.map((q) => q.section))].filter(
      (s) => !SECTION_ORDER.includes(s),
    ),
  ];

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
          Анкетирование ИБ
        </div>
        <h1 className="text-xl font-bold text-gray-900">Вопросы анкеты</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Отметьте, какие вопросы обязательны для заполнения подрядчиком.
        </p>
      </div>

      {loadError && (
        <div className="mb-6 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          {loadError}
        </div>
      )}

      <div className="space-y-6">
        {sectionKeys.map((sectionKey) => {
          const sectionQuestions = questions
            .filter((q) => q.section === sectionKey)
            .sort((a, b) => a.order - b.order);

          return (
            <div
              key={sectionKey}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-800">
                  {SECTION_LABELS[sectionKey] ?? sectionKey}
                </h2>
              </div>
              <div className="divide-y divide-gray-100">
                {sectionQuestions.map((q) => (
                  <div key={q.id} className="px-6 py-4 flex items-start gap-4">
                    <p className="flex-1 text-sm text-gray-800">
                      <span className="font-medium text-gray-400 mr-2">{q.code}</span>
                      {q.text}
                    </p>
                    <div className="shrink-0 flex items-center gap-2 pt-0.5">
                      <span className="text-xs text-gray-500">Обязательный</span>
                      <RequiredToggle
                        checked={q.required}
                        disabled={savingIds[q.id]}
                        onChange={() => toggleRequired(q)}
                      />
                      <span className="w-20 text-[11px]">
                        {savingIds[q.id] ? (
                          <span className="text-gray-400">Сохранение...</span>
                        ) : errorIds[q.id] ? (
                          <span className="text-red-600">Ошибка</span>
                        ) : null}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
