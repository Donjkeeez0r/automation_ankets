import type { Recommendation } from '../types';

export default function RecommendationsList({
  recommendations,
}: {
  recommendations: Recommendation[];
}) {
  if (recommendations.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
        <div className="text-green-700 font-semibold text-lg mb-1">Рекомендации отсутствуют</div>
        <div className="text-sm text-green-600">Подрядчик полностью соответствует требованиям</div>
      </div>
    );
  }

  const grouped = recommendations.reduce<Record<string, Recommendation[]>>((acc, rec) => {
    if (!acc[rec.category]) acc[rec.category] = [];
    acc[rec.category].push(rec);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, recs]) => (
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
  );
}
