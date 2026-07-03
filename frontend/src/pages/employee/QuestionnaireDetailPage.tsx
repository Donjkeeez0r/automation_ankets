import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getQuestionnaire, updateStatus } from '../../api/questionnaire';
import StatusBadge from '../../components/StatusBadge';
import type { Questionnaire, Status } from '../../types';

const SECTION_LABELS: Record<string, string> = {
  general_info:  '1.1 Общие сведения',
  ib_measures:   '1.2 Меры ИБ',
  remote_access: '2. Удалённый доступ',
  software_dev:  '3. Разработка ПО',
  contractors:   '4. Подрядчики',
};

// Ответы на вопросы разделов ГИС и ПДн показываются внутри "1.2 Меры ИБ",
// сразу после основных вопросов раздела (см. FillQuestionnairePage).
const APPENDED_SECTIONS = ['gis', 'pdn'];

const STATUS_TRANSITIONS: Record<string, Status[]> = {
  SUBMITTED:  ['IN_REVIEW', 'DECLINED'],
  IN_REVIEW:  ['APPROVED', 'DECLINED', 'REVISION'],
  REVISION:   ['IN_REVIEW'],
};

const STATUS_LABELS: Record<Status, string> = {
  DRAFT:      'Черновик',
  SUBMITTED:  'Отправлена',
  IN_REVIEW:  'На проверке',
  APPROVED:   'Одобрена',
  DECLINED:   'Отклонена',
  REVISION:   'На доработке',
};

export default function QuestionnaireDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;
    getQuestionnaire(id)
      .then((r) => setQuestionnaire(r.data))
      .catch(() => setError('Не удалось загрузить анкету'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusChange = async (newStatus: Status) => {
    if (!id) return;
    setUpdating(true);
    try {
      const { data } = await updateStatus(id, newStatus, comment || undefined);
      setQuestionnaire(data);
      setComment('');
    } catch {
      setError('Не удалось изменить статус');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="text-sm text-gray-500">Загрузка...</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!questionnaire) return null;

  const transitions = STATUS_TRANSITIONS[questionnaire.status] ?? [];
  const sections = Object.keys(SECTION_LABELS);
  const allAnswers = questionnaire.answers ?? [];
  const answersBySection = sections.map((section) => {
    let sectionAnswers = allAnswers
      .filter((a) => a.question.section === section)
      .sort((a, b) => a.question.order - b.question.order);
    if (section === 'ib_measures') {
      for (const appendedSection of APPENDED_SECTIONS) {
        const appendedAnswers = allAnswers
          .filter((a) => a.question.section === appendedSection)
          .sort((a, b) => a.question.order - b.question.order);
        sectionAnswers = [...sectionAnswers, ...appendedAnswers];
      }
    }
    return { section, answers: sectionAnswers };
  }).filter((s) => s.answers.length > 0);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700">
          ← Назад
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">
            Анкета: {questionnaire.contractor?.name}
          </h1>
          <p className="text-sm text-gray-500">{questionnaire.contractor?.organization}</p>
        </div>
        <StatusBadge status={questionnaire.status} />
      </div>

      <div className="flex gap-3 mb-6">
        <Link
          to={`/questionnaires/${id}/scoring`}
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
        >
          Скоринг
        </Link>
        <Link
          to={`/questionnaires/${id}/recommendations`}
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
        >
          Рекомендации
        </Link>
      </div>

      {transitions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Изменить статус</h3>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="Комментарий (необязательно)..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-3"
          />
          <div className="flex flex-wrap gap-2">
            {transitions.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                disabled={updating}
                className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 disabled:opacity-50 transition-colors"
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      )}

      {questionnaire.comment && (
        <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
          <span className="font-medium">Комментарий:</span> {questionnaire.comment}
        </div>
      )}

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
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
