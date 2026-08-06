import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getQuestionnaire,
  getScoring,
  getRecommendations,
  updateStatus,
  deleteQuestionnaire,
} from '../../api/questionnaire';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import AnswersView from '../../components/AnswersView';
import ScoringTiles from '../../components/ScoringTiles';
import RecommendationsList from '../../components/RecommendationsList';
import type {
  Questionnaire,
  ScoringResult,
  Recommendation,
  Status,
} from '../../types';

type Tab = 'answers' | 'scoring' | 'recommendations';

const TABS: { key: Tab; label: string }[] = [
  { key: 'answers', label: 'Ответы' },
  { key: 'scoring', label: 'Скоринг' },
  { key: 'recommendations', label: 'Рекомендации' },
];

export default function QuestionnaireReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [scoring, setScoring] = useState<ScoringResult | null>(null);
  const [scoringError, setScoringError] = useState('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recommendationsError, setRecommendationsError] = useState('');

  const [tab, setTab] = useState<Tab>('answers');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [comment, setComment] = useState('');
  const [deadline, setDeadline] = useState('');
  const [updating, setUpdating] = useState(false);
  const [actionError, setActionError] = useState('');

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const loadQuestionnaire = () => {
    if (!id) return;
    getQuestionnaire(id)
      .then((r) => setQuestionnaire(r.data))
      .catch(() => setError('Не удалось загрузить анкету'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!id) return;
    loadQuestionnaire();
    getScoring(id)
      .then((r) => setScoring(r.data))
      .catch(() => setScoringError('Скоринг ещё не рассчитан. Анкета должна быть отправлена.'));
    getRecommendations(id)
      .then((r) => setRecommendations(r.data))
      .catch(() => setRecommendationsError('Не удалось загрузить рекомендации'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleStatusChange = async (status: Status) => {
    if (!id) return;
    if (status === 'REVISION' && !comment.trim()) {
      setActionError('Для отправки на дозаполнение укажите комментарий.');
      return;
    }
    setUpdating(true);
    setActionError('');
    try {
      // Дедлайн имеет смысл только при отправке на дозаполнение.
      // input[type=date] уже даёт «2026-08-15» — конкатенируем время напрямую,
      // чтобы не прогонять через new Date() (трактует строку как локальное время
      // и сдвигает календарный день в часовых поясах со смещением).
      const deadlineAt =
        status === 'REVISION' && deadline
          ? `${deadline}T00:00:00.000Z`
          : undefined;
      const { data } = await updateStatus(
        id,
        status,
        comment.trim() || undefined,
        deadlineAt,
      );
      setQuestionnaire(data);
      setComment('');
      setDeadline('');
    } catch {
      setActionError('Не удалось изменить статус');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteQuestionnaire(id);
      navigate('/questionnaires', { replace: true });
    } catch {
      setDeleteError('Не удалось удалить анкету');
      setDeleting(false);
    }
  };

  if (loading) return <div className="text-sm text-gray-500">Загрузка...</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!questionnaire) return null;

  const canDecide = questionnaire.status !== 'DRAFT';

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Назад
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">
            Анкета: {questionnaire.company?.name ?? '—'}
          </h1>
          {questionnaire.company && (
            <p className="text-sm text-gray-500">
              {questionnaire.company.contactName} · {questionnaire.company.contactEmail}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <StatusBadge status={questionnaire.status} />
          {questionnaire.deadlineAt && (
            <div className="mt-1 text-xs text-gray-500">
              Дедлайн:{' '}
              {new Date(questionnaire.deadlineAt).toLocaleDateString('ru-RU', {
                timeZone: 'UTC',
              })}
            </div>
          )}
        </div>
        <button
          onClick={() => setConfirmDelete(true)}
          className="shrink-0 px-3 py-1.5 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
        >
          Удалить
        </button>
      </div>

      {questionnaire.comment && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
          <span className="font-medium">Комментарий:</span> {questionnaire.comment}
        </div>
      )}

      {canDecide && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Решение по анкете</h3>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="Комментарий (обязателен для «На дозаполнение»)..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-3"
          />
          <label className="flex flex-wrap items-center gap-2 mb-3 text-sm text-gray-600">
            Дедлайн дозаполнения (необязательно):
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleStatusChange('APPROVED')}
              disabled={updating}
              className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              Согласовать
            </button>
            <button
              onClick={() => handleStatusChange('DECLINED')}
              disabled={updating}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              Отклонить
            </button>
            <button
              onClick={() => handleStatusChange('REVISION')}
              disabled={updating}
              className="px-4 py-2 bg-yellow-500 text-white text-sm font-medium rounded-lg hover:bg-yellow-600 disabled:opacity-50 transition-colors"
            >
              На дозаполнение
            </button>
          </div>
          {actionError && <div className="mt-3 text-sm text-red-600">{actionError}</div>}
        </div>
      )}

      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'answers' && <AnswersView answers={questionnaire.answers ?? []} />}

      {tab === 'scoring' &&
        (scoring ? (
          <ScoringTiles scoring={scoring} />
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-sm text-yellow-800">
            {scoringError || 'Скоринг недоступен.'}
          </div>
        ))}

      {tab === 'recommendations' &&
        (recommendationsError ? (
          <div className="text-sm text-red-600">{recommendationsError}</div>
        ) : (
          <RecommendationsList recommendations={recommendations} />
        ))}

      <ConfirmDialog
        open={confirmDelete}
        title="Удалить анкету?"
        description={
          <>
            <p>
              Анкета компании «{questionnaire.company?.name ?? '—'}» будет удалена
              вместе со всеми ответами, скорингом и ссылками.
            </p>
            <p className="font-medium text-red-600">Действие необратимо.</p>
          </>
        }
        busy={deleting}
        error={deleteError}
        onConfirm={handleDelete}
        onCancel={() => {
          setConfirmDelete(false);
          setDeleteError('');
        }}
      />
    </div>
  );
}
