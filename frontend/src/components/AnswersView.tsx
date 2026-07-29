import type { AnswerWithQuestion } from '../types';

const SECTION_LABELS: Record<string, string> = {
  general_info:  '1.1 Общие сведения',
  ib_measures:   '1.2 Меры ИБ',
  remote_access: '2. Удалённый доступ',
  software_dev:  '3. Разработка ПО',
  contractors:   '4. Подрядчики',
};

// Ответы разделов ГИС и ПДн показываются внутри "1.2 Меры ИБ"
// (так же, как они отображаются в форме заполнения).
const APPENDED_SECTIONS = ['gis', 'pdn'];

export default function AnswersView({ answers }: { answers: AnswerWithQuestion[] }) {
  const sections = Object.keys(SECTION_LABELS);
  const answersBySection = sections
    .map((section) => {
      let sectionAnswers = answers
        .filter((a) => a.question.section === section)
        .sort((a, b) => a.question.order - b.question.order);
      if (section === 'ib_measures') {
        for (const appended of APPENDED_SECTIONS) {
          const appendedAnswers = answers
            .filter((a) => a.question.section === appended)
            .sort((a, b) => a.question.order - b.question.order);
          sectionAnswers = [...sectionAnswers, ...appendedAnswers];
        }
      }
      return { section, answers: sectionAnswers };
    })
    .filter((s) => s.answers.length > 0);

  if (answersBySection.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 text-sm">
        Анкета ещё не заполнена
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {answersBySection.map(({ section, answers }) => (
        <div key={section} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-800">
              {SECTION_LABELS[section] ?? section}
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {answers.map((a) => (
              <div
                key={a.questionId}
                className={`px-6 py-3 flex gap-4 ${
                  APPENDED_SECTIONS.includes(a.question.section) ? 'bg-gray-50/50' : ''
                }`}
              >
                <span className="text-xs text-gray-400 w-14 shrink-0 pt-0.5">
                  {a.question.code}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-gray-700 mb-1">{a.question.text}</p>
                  <span className="inline-block text-sm font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {a.value || '—'}
                  </span>
                  {a.additionalValue && (
                    <p className="mt-1 text-xs text-gray-500">{a.additionalValue}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
