import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllQuestionnaires } from '../../api/questionnaire';
import StatusBadge from '../../components/StatusBadge';
import type { Questionnaire } from '../../types';

export default function AllQuestionnairesPage() {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getAllQuestionnaires()
      .then((r) => setQuestionnaires(r.data))
      .catch(() => setError('Не удалось загрузить анкеты'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-gray-500">Загрузка...</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Все анкеты</h1>
        <Link
          to="/questionnaires/new"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Создать анкету
        </Link>
      </div>

      {questionnaires.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 text-sm">
          Анкеты не найдены
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 font-medium text-gray-500">Подрядчик</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Организация</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Дата создания</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Статус</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {questionnaires.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {q.contractor?.name ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {q.contractor?.organization ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(q.createdAt).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={q.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/questionnaires/${q.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Открыть
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
