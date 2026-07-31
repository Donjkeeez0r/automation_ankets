import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllQuestionnaires, deleteQuestionnaire } from '../../api/questionnaire';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import type { Questionnaire } from '../../types';

export default function QuestionnairesListPage() {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [toDelete, setToDelete] = useState<Questionnaire | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    getAllQuestionnaires()
      .then((r) => setQuestionnaires(r.data))
      .catch(() => setError('Не удалось загрузить анкеты'))
      .finally(() => setLoading(false));
  }, []);

  const closeDialog = () => {
    setToDelete(null);
    setDeleteError('');
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteQuestionnaire(toDelete.id);
      setQuestionnaires((prev) => prev.filter((q) => q.id !== toDelete.id));
      closeDialog();
    } catch {
      setDeleteError('Не удалось удалить анкету');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="text-sm text-gray-500">Загрузка...</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Анкеты</h1>

      {questionnaires.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 text-sm">
          Анкеты не найдены
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 font-medium text-gray-500">Компания</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Контакт</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Дата создания</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Статус</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {questionnaires.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {q.company?.name ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {q.company?.contactName ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(q.createdAt).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={q.status} />
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <Link
                      to={`/questionnaires/${q.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Открыть
                    </Link>
                    <button
                      onClick={() => setToDelete(q)}
                      className="ml-4 text-red-600 hover:underline font-medium"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Удалить анкету?"
        description={
          <>
            <p>
              Анкета компании «{toDelete?.company?.name ?? '—'}» будет удалена
              вместе со всеми ответами, скорингом и ссылками.
            </p>
            <p className="font-medium text-red-600">Действие необратимо.</p>
          </>
        }
        busy={deleting}
        error={deleteError}
        onConfirm={handleDelete}
        onCancel={closeDialog}
      />
    </div>
  );
}
