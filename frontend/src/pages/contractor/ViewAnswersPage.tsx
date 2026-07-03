import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuestionnaire, getMyRecommendations } from '../../api/questionnaire';
import StatusBadge from '../../components/StatusBadge';
import type { Questionnaire, Recommendation, Status } from '../../types';

const RECOMMENDATIONS_STATUSES: Status[] = ['APPROVED', 'REVISION', 'DECLINED'];

const SECTION_LABELS: Record<string, string> = {
  general_info:  '1.1 Общие сведения',
  ib_measures:   '1.2 Меры ИБ',
  gis:           '1.3 ГИС',
  pdn:           '1.4 ПДн',
  remote_access: '2. Удалённый доступ',
  software_dev:  '3. Разработка ПО',
  contractors:   '4. Подрядчики',
};

export default function ViewAnswersPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showRecommendations, setShowRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState('');

  useEffect(() => {
    if (!id) return;
    getQuestionnaire(id)
      .then((r) => setQuestionnaire(r.data))
      .catch(() => setError('Не удалось загрузить анкету'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleShowRecommendations = () => {
    if (!id) return;
    setShowRecommendations(true);
    setRecLoading(true);
    setRecError('');
    getMyRecommendations(id)
      .then((r) => setRecommendations(r.data))
      .catch(() => setRecError('Не удалось загрузить рекомендации'))
      .finally(() => setRecLoading(false));
  };

  if (loading) return <div className="text-sm text-gray-500">Загрузка...</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!questionnaire) return null;

  const sections = Object.keys(SECTION_LABELS);
  const answersBySection = sections.map((section) => {
    const sectionAnswers = (questionnaire.answers ?? []).filter(
      (a) => a.question.section === section,
    );
    return { section, answers: sectionAnswers };
  }).filter((s) => s.answers.length > 0);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Назад
        </button>
        <h1 className="text-xl font-bold text-gray-900 flex-1">Просмотр анкеты</h1>
        <StatusBadge status={questionnaire.status} />
        {RECOMMENDATIONS_STATUSES.includes(questionnaire.status) && !showRecommendations && (
          <button
            onClick={handleShowRecommendations}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Посмотреть рекомендации
          </button>
        )}
      </div>

      {showRecommendations && (
        <div className="mb-4">
          {recLoading ? (
            <div className="text-sm text-gray-500">Загрузка рекомендаций...</div>
          ) : recError ? (
            <div className="text-sm text-red-600">{recError}</div>
          ) : recommendations.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
              <div className="text-green-700 font-semibold text-lg mb-1">Рекомендации отсутствуют</div>
              <div className="text-sm text-green-600">Полное соответствие требованиям</div>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(
                recommendations.reduce<Record<string, Recommendation[]>>((acc, rec) => {
                  if (!acc[rec.category]) acc[rec.category] = [];
                  acc[rec.category].push(rec);
                  return acc;
                }, {}),
              ).map(([category, recs]) => (
                <div key={category} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-6 py-3 bg-orange-50 border-b border-orange-100">
                    <h2 className="text-sm font-semibold text-orange-800">{category}</h2>
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {recs.map((rec, i) => (
                      <li key={i} className="px-6 py-3 text-sm text-gray-700 flex gap-3">
                        <span className="text-orange-400 shrink-0 mt-0.5">•</span>
                        {rec.text}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
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
              {answers
                .sort((a, b) => a.question.order - b.question.order)
                .map((a) => (
                  <div key={a.questionId} className="px-6 py-3 flex gap-4">
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
