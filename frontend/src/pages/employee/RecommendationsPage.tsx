import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecommendations } from '../../api/questionnaire';
import type { Recommendation } from '../../types';

export default function RecommendationsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getRecommendations(id)
      .then((r) => setRecommendations(r.data))
      .catch(() => setError('Не удалось загрузить рекомендации'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-sm text-gray-500">Загрузка...</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;

  const grouped = recommendations.reduce<Record<string, Recommendation[]>>((acc, rec) => {
    if (!acc[rec.category]) acc[rec.category] = [];
    acc[rec.category].push(rec);
    return acc;
  }, {});

  const categories = Object.keys(grouped);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700">
          ← Назад
        </button>
        <h1 className="text-xl font-bold text-gray-900">Рекомендации</h1>
        {recommendations.length > 0 && (
          <span className="ml-auto text-sm text-gray-500">
            {recommendations.length} рекомендаций
          </span>
        )}
      </div>

      {categories.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <div className="text-green-700 font-semibold text-lg mb-1">Рекомендации отсутствуют</div>
          <div className="text-sm text-green-600">Подрядчик полностью соответствует требованиям</div>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => (
            <div key={category} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-3 bg-orange-50 border-b border-orange-100">
                <h2 className="text-sm font-semibold text-orange-800">{category}</h2>
              </div>
              <ul className="divide-y divide-gray-100">
                {grouped[category].map((rec, i) => (
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
  );
}
