import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAllQuestions, getQuestionnaire, saveAnswers, submitQuestionnaire } from '../../api/questionnaire';
import type { Question, Answer, Questionnaire } from '../../types';

const SECTION_LABELS: Record<string, string> = {
  general_info:  '1.1 Общие сведения',
  ib_measures:   '1.2 Меры ИБ',
  remote_access: '2. Удалённый доступ',
  software_dev:  '3. Разработка ПО',
  contractors:   '4. Подрядчики',
};

const TRIGGER_SECTIONS: Record<string, string> = {
  '1.1.10': 'remote_access',
  '1.1.11': 'software_dev',
  '1.1.8':  'contractors',
};

// Вопросы 1.3.1 (ГИС) и 1.4.1 (ПДн) отображаются сразу после 1.2.17 внутри
// раздела "1.2 Меры ИБ"; при ответе "Да" под ними раскрываются вопросы их раздела.
const APPENDED_TRIGGERS: { code: string; section: string }[] = [
  { code: '1.3.1', section: 'gis' },
  { code: '1.4.1', section: 'pdn' },
];

const YESNO_OPTIONS = ['Да', 'Нет'];
const YESNO_NA_OPTIONS = ['Да', 'Нет', 'Не предполагается'];
const YESNO_PARTIAL_OPTIONS = ['Реализовано в полной мере', 'Реализовано частично', 'Не реализовано'];
const YESNO_ARCH_OPTIONS = ['Да', 'Нет', 'Не требуется по архитектуре Организации'];
const YESNO_NOWORK_OPTIONS = ['Да', 'Нет', 'Не предполагается данный вид работ/услуг'];

const SOC_TYPE_OPTIONS = ['Внутренний (собственный)', 'Договор с внешним'];

const ADDITIONAL_VALUE_PLACEHOLDERS: Record<string, string> = {
  '1.1.5': 'Укажите наименование и реквизиты документа',
  '1.1.6': 'Укажите виды лицензируемых работ',
  '1.1.7': 'Укажите виды лицензируемых работ',
  '1.2.1': 'Укажите реквизиты отчета по результатам последнего внешнего аудита ИБ',
  '1.2.2': 'Укажите наименование и реквизиты документа',
  '1.2.3': 'Укажите наименование и реквизиты документа',
  '1.2.4': 'Укажите наименование и реквизиты документа',
  '1.2.5': 'Укажите наименование и реквизиты документа',
  '1.2.6': 'Укажите способ организации SOC',
  '1.2.7': 'Укажите используемые СрЗИ, комментарии к ним',
  '1.2.8': 'Укажите используемые СрЗИ, комментарии к ним',
  '1.2.9': 'Укажите используемые СрЗИ, комментарии к ним',
  '1.2.10': 'Укажите используемые СрЗИ, комментарии к ним',
  '1.2.11': 'Укажите используемые СрЗИ, комментарии к ним',
  '1.2.12': 'Укажите используемые СрЗИ, комментарии к ним',
  '1.2.13': 'Укажите используемые СрЗИ, комментарии к ним',
  '1.2.14': 'Укажите используемые СрЗИ, комментарии к ним',
  '1.2.15': 'Укажите используемые СрЗИ, комментарии к ним',
  '1.2.16': 'Укажите используемые СрЗИ, комментарии к ним',
  '1.2.17': 'Укажите используемые СрЗИ, комментарии к ним',
  '1.3.2': 'Введите ответ...',
  '1.3.3': 'Введите ответ...',
  '1.3.4': 'Введите ответ...',
  '1.3.5': 'Введите ответ...',
  '1.4.2': 'Введите ответ...',
  '1.4.3': 'Введите ответ...',
  '1.4.4': 'Введите ответ...',
  '1.4.5': 'Введите ответ...',
  '1.4.6': 'Введите ответ...',
};

const ADDITIONAL_VALUE_SECTIONS: Record<string, string> = {
  remote_access: 'Опишите реализованную меру...',
  software_dev: 'Опишите реализованную меру...',
};

function triggersAdditionalValue(question: Question, value: string): boolean {
  if (question.type === 'yesno_partial') {
    return value === 'Реализовано в полной мере' || value === 'Реализовано частично';
  }
  if (question.type === 'yesno_nowork') {
    return false;
  }
  return value === 'Да';
}

function AnswerInput({
  question,
  value,
  additionalValue,
  onChange,
  onAdditionalChange,
}: {
  question: Question;
  value: string;
  additionalValue: string;
  onChange: (v: string) => void;
  onAdditionalChange: (v: string) => void;
}) {
  const options =
    question.type === 'yesno'
      ? YESNO_OPTIONS
      : question.type === 'yesno_na'
      ? YESNO_NA_OPTIONS
      : question.type === 'yesno_partial'
      ? YESNO_PARTIAL_OPTIONS
      : question.type === 'yesno_arch'
      ? YESNO_ARCH_OPTIONS
      : question.type === 'yesno_nowork'
      ? YESNO_NOWORK_OPTIONS
      : null;

  if (question.type === 'text') {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        placeholder="Введите ответ..."
      />
    );
  }

  if (options) {
    const additionalPlaceholder =
      ADDITIONAL_VALUE_PLACEHOLDERS[question.code] ?? ADDITIONAL_VALUE_SECTIONS[question.section];
    const showAdditional = triggersAdditionalValue(question, value);
    const isSocType = question.code === '1.2.6' && value === 'Да';
    return (
      <div>
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                value === opt
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
        {isSocType ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {SOC_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onAdditionalChange(opt)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  additionalValue === opt
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        ) : (
          additionalPlaceholder &&
          showAdditional && (
            <textarea
              value={additionalValue}
              onChange={(e) => onAdditionalChange(e.target.value)}
              rows={2}
              className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder={additionalPlaceholder}
            />
          )
        )}
      </div>
    );
  }

  return null;
}

export default function FillQuestionnairePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [additionalValues, setAdditionalValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([getAllQuestions(), getQuestionnaire(id)])
      .then(([qRes, anketaRes]) => {
        setQuestions(qRes.data);
        setQuestionnaire(anketaRes.data);
        const existing: Record<string, string> = {};
        const existingAdditional: Record<string, string> = {};
        for (const a of anketaRes.data.answers ?? []) {
          existing[a.questionId] = a.value;
          if (a.additionalValue) existingAdditional[a.questionId] = a.additionalValue;
        }
        setAnswers(existing);
        setAdditionalValues(existingAdditional);
      })
      .catch(() => setError('Не удалось загрузить данные'))
      .finally(() => setLoading(false));
  }, [id]);

  const getVisibleSections = useCallback(() => {
    const visible = new Set(['general_info', 'ib_measures']);
    for (const [code, section] of Object.entries(TRIGGER_SECTIONS)) {
      const triggerQ = questions.find((q) => q.code === code);
      if (triggerQ && answers[triggerQ.id] === 'Да') {
        visible.add(section);
      }
    }
    return visible;
  }, [questions, answers]);

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setSaved(false);
  };

  const handleAdditionalAnswer = (questionId: string, value: string) => {
    setAdditionalValues((prev) => ({ ...prev, [questionId]: value }));
    setSaved(false);
  };

  const doSave = async () => {
    if (!id) return;
    const payload: Answer[] = Object.entries(answers).map(([questionId, value]) => ({
      questionId,
      value,
      additionalValue: additionalValues[questionId] || undefined,
    }));
    await saveAnswers(id, payload);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await doSave();
      setSaved(true);
    } catch {
      setError('Не удалось сохранить ответы');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!id) return;
    setSubmitting(true);
    try {
      await doSave();
      await submitQuestionnaire(id);
      navigate('/my-questionnaires');
    } catch {
      setError('Не удалось отправить анкету');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-sm text-gray-500">Загрузка...</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!questionnaire) return null;

  const visibleSections = getVisibleSections();
  const sectionKeys = Object.keys(SECTION_LABELS).filter((s) => visibleSections.has(s));

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Заполнение анкеты</h1>
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Сохранение...' : saved ? 'Сохранено ✓' : 'Сохранить'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Отправка...' : 'Отправить анкету'}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {sectionKeys.map((sectionKey) => {
          let sectionQuestions = questions
            .filter((q) => q.section === sectionKey)
            .sort((a, b) => a.order - b.order);

          if (sectionKey === 'ib_measures') {
            for (const { code, section } of APPENDED_TRIGGERS) {
              const triggerQ = questions.find((q) => q.code === code);
              if (!triggerQ) continue;
              sectionQuestions = [...sectionQuestions, triggerQ];
              if (answers[triggerQ.id] === 'Да') {
                const childQuestions = questions
                  .filter((q) => q.section === section && q.code !== code)
                  .sort((a, b) => a.order - b.order);
                sectionQuestions = [...sectionQuestions, ...childQuestions];
              }
            }
          }

          if (sectionQuestions.length === 0) return null;

          return (
            <div
              key={sectionKey}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-800">
                  {SECTION_LABELS[sectionKey]}
                </h2>
              </div>
              <div className="divide-y divide-gray-100">
                {sectionQuestions.map((q) => (
                  <div
                    key={q.id}
                    className={`px-6 py-4 ${
                      (q.section === 'gis' || q.section === 'pdn') && q.order > 1
                        ? 'pl-10 bg-gray-50/50'
                        : ''
                    }`}
                  >
                    <p className="text-sm text-gray-800 mb-3">
                      <span className="font-medium text-gray-400 mr-2">{q.code}</span>
                      {q.text}
                    </p>
                    <AnswerInput
                      question={q}
                      value={answers[q.id] ?? ''}
                      additionalValue={additionalValues[q.id] ?? ''}
                      onChange={(v) => handleAnswer(q.id, v)}
                      onAdditionalChange={(v) => handleAdditionalAnswer(q.id, v)}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Сохранение...' : 'Сохранить черновик'}
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Отправка...' : 'Отправить анкету'}
        </button>
      </div>
    </div>
  );
}
