import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getAllQuestions } from '../../api/questionnaire';
import { getLinkByToken, saveAnswersByToken, submitByToken } from '../../api/links';
import type { Question, Answer, LinkByToken } from '../../types';

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

// Бэкенд отвечает 400 с { message, missingCodes: ['1.2.1', ...] }, если
// не заполнены обязательные вопросы.
function missingCodesFromError(err: unknown): string[] | null {
  const codes = (err as { response?: { data?: { missingCodes?: unknown } } })?.response?.data
    ?.missingCodes;
  if (!Array.isArray(codes) || codes.length === 0) return null;
  return codes.filter((c): c is string => typeof c === 'string');
}

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

export default function FillPage() {
  const { token } = useParams<{ token: string }>();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [link, setLink] = useState<LinkByToken | null>(null);
  // ключ — questionId
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [additionalValues, setAdditionalValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([getAllQuestions(), getLinkByToken(token)])
      .then(([qRes, linkRes]) => {
        setQuestions(qRes.data);
        setLink(linkRes.data);
        const existing: Record<string, string> = {};
        const existingAdditional: Record<string, string> = {};
        for (const a of linkRes.data.questionnaire.answers ?? []) {
          existing[a.questionId] = a.value;
          if (a.additionalValue) existingAdditional[a.questionId] = a.additionalValue;
        }
        setAnswers(existing);
        setAdditionalValues(existingAdditional);
      })
      .catch(() => setInvalid(true))
      .finally(() => setLoading(false));
  }, [token]);

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
    if (!token) return;
    const payload: Answer[] = Object.entries(answers).map(([questionId, value]) => ({
      questionId,
      value,
      additionalValue: additionalValues[questionId] || undefined,
    }));
    await saveAnswersByToken(token, payload);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
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
    if (!token) return;
    setSubmitting(true);
    setError('');
    try {
      await doSave();
      await submitByToken(token);
      setSubmitted(true);
    } catch (err) {
      const missing = missingCodesFromError(err);
      setError(
        missing
          ? `Заполните обязательные вопросы: ${missing.join(', ')}`
          : 'Не удалось отправить анкету',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-500">
        Загрузка...
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md text-center">
          <div className="text-3xl mb-3">🔒</div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">Ссылка недоступна</h1>
          <p className="text-sm text-gray-500">
            Ссылка недействительна или срок её действия истёк. Обратитесь к сотруднику,
            который её предоставил.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md text-center">
          <div className="text-3xl mb-3">✅</div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">Анкета отправлена</h1>
          <p className="text-sm text-gray-500">
            Спасибо! Ваши ответы переданы на проверку. Эту вкладку можно закрыть.
          </p>
        </div>
      </div>
    );
  }

  if (!link) return null;

  const visibleSections = getVisibleSections();
  const sectionKeys = Object.keys(SECTION_LABELS).filter((s) => visibleSections.has(s));

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
            Анкетирование ИБ
          </div>
          <h1 className="text-xl font-bold text-gray-900">Заполнение анкеты</h1>
          {link.questionnaire.company?.name && (
            <p className="text-sm text-gray-500 mt-0.5">
              Компания: {link.questionnaire.company.name}
            </p>
          )}
        </div>

        {link.questionnaire.comment && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
            <span className="font-medium">Комментарий проверяющего:</span>{' '}
            {link.questionnaire.comment}
          </div>
        )}

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
                        {q.required && (
                          <span className="text-red-600 ml-1" aria-label="Обязательный вопрос">
                            *
                          </span>
                        )}
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

        {error && (
          <div className="mt-6 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Сохранение...' : saved ? 'Сохранено ✓' : 'Сохранить черновик'}
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
    </div>
  );
}
