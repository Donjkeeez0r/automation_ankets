import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyQuestionnaires } from '../../api/questionnaire';
import StatusBadge from '../../components/StatusBadge';
import type { Questionnaire } from '../../types';

export default function MyQuestionnairesPage() {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyQuestionnaires()
      .then((r) => setQuestionnaires(r.data))
      .catch(() => setError('Не удалось загрузить анкеты'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-gray-500">Загрузка...</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Мои анкеты</h1>

      {questionnaires.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 text-sm">
          У вас пока нет анкет. Ожидайте назначения от сотрудника ПАО.
        </div>
      ) : (
        <div className="space-y-3">
          {questionnaires.map((q) => (
            <div
              key={q.id}
              className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between hover:shadow-sm transition-shadow"
            >
              <div>
                <div className="text-sm font-medium text-gray-900 mb-1">
                  Анкета от {new Date(q.createdAt).toLocaleDateString('ru-RU')}
                </div>
                <StatusBadge status={q.status} />
                {q.comment && (
                  <p className="mt-2 text-xs text-gray-500 italic">{q.comment}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {(q.status === 'DRAFT' || q.status === 'REVISION') && (
                  <Link
                    to={`/questionnaires/${q.id}/fill`}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Заполнить
                  </Link>
                )}
                <Link
                  to={`/questionnaires/${q.id}/view`}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Просмотр
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
