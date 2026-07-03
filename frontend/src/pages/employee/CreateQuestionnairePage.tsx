import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getContractors } from '../../api/users';
import { createQuestionnaire } from '../../api/questionnaire';
import type { Contractor } from '../../types';

export default function CreateQuestionnairePage() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getContractors()
      .then((r) => setContractors(r.data))
      .catch(() => setError('Не удалось загрузить список подрядчиков'))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!selected) return;
    setCreating(true);
    try {
      const { data } = await createQuestionnaire(selected);
      navigate(`/questionnaires/${data.id}`);
    } catch {
      setError('Не удалось создать анкету');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="text-sm text-gray-500">Загрузка...</div>;

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Создать анкету</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Выберите подрядчика
          </label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">— выберите подрядчика —</option>
            {contractors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.organization})
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => navigate('/questionnaires')}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleCreate}
            disabled={!selected || creating}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {creating ? 'Создание...' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  );
}
