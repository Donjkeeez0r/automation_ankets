import { useEffect, useState } from 'react';
import { getActivityLog } from '../api/questionnaire';
import type { ActivityLogEntry } from '../types';

// Цвет точки на ленте по типу события; неизвестные типы — нейтрально-серые.
const DOT_COLORS: Record<string, string> = {
  LINK_CREATED: 'bg-blue-500',
  SUBMITTED: 'bg-indigo-500',
  DECISION_MADE: 'bg-emerald-500',
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function ActivityLogView({
  questionnaireId,
}: {
  questionnaireId: string;
}) {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    getActivityLog(questionnaireId)
      .then((r) => setEntries(r.data))
      .catch(() => setError('Не удалось загрузить историю действий'))
      .finally(() => setLoading(false));
  }, [questionnaireId]);

  if (loading) {
    return <div className="text-sm text-gray-500">Загрузка истории…</div>;
  }

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
        <div className="text-gray-700 font-semibold text-lg mb-1">История пока пуста</div>
        <div className="text-sm text-gray-500">
          Здесь появятся события по анкете: создание ссылки, отправка, решения аудитора
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <ol className="relative">
        {entries.map((entry, i) => (
          <li key={entry.id} className="relative pl-8 pb-6 last:pb-0">
            {/* Вертикальная линия соединяет точки; у последнего события её нет. */}
            {i < entries.length - 1 && (
              <span
                aria-hidden
                className="absolute left-[5px] top-3 bottom-0 w-px bg-gray-200"
              />
            )}
            <span
              aria-hidden
              className={`absolute left-0 top-1.5 w-[11px] h-[11px] rounded-full ring-4 ring-white ${
                DOT_COLORS[entry.type] ?? 'bg-gray-400'
              }`}
            />
            <div className="text-sm text-gray-800">{entry.description}</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {formatDateTime(entry.createdAt)}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
