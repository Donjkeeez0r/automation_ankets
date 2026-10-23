import { lazy, Suspense, useState } from 'react';
import MaturityLevelBadge from './MaturityLevelBadge';
import TargetLevelPicker from './TargetLevelPicker';
import { apiErrorMessage, formatNumber, levelColor } from '../../lib/maturity';
import type { MaturityItem, MaturityReference, MaturityResult } from '../../types/maturity';

// recharts заметно тяжёлый — грузим его отдельным чанком только на странице
// результата, чтобы не утяжелять остальное приложение и форму подрядчика
const MaturityRadarChart = lazy(() => import('./MaturityRadarChart'));

function OverallCard({
  result,
  reference,
  canEdit,
  onChangeTarget,
}: {
  result: MaturityResult;
  reference: MaturityReference;
  canEdit: boolean;
  onChangeTarget: (level: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [level, setLevel] = useState(result.targetLevel);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const color = levelColor(result.overallLevel);
  const meets =
    result.overallLevel === null ? null : result.overallLevel >= result.targetLevel;

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await onChangeTarget(level);
      setEditing(false);
    } catch (err) {
      setError(apiErrorMessage(err, 'Не удалось изменить целевой уровень'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className={`sm:col-span-1 rounded-xl border p-5 flex flex-col items-center text-center ${color.soft}`}>
        <div className="text-xs font-medium text-gray-600">Уровень зрелости (Узи)</div>
        <div className={`mt-1 text-4xl font-bold ${color.text}`}>{formatNumber(result.overall)}</div>
        <div className="mt-2">
          <MaturityLevelBadge level={result.overallLevel} name={result.overallLevelName} />
        </div>
        {meets !== null && (
          <div className={`mt-2 text-xs font-medium ${meets ? 'text-green-700' : 'text-red-600'}`}>
            {meets ? '✓ Целевой уровень достигнут' : '✗ Ниже целевого уровня'}
          </div>
        )}
      </div>

      <div className="sm:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-gray-500">Целевой уровень</div>
            <div className="mt-1">
              <MaturityLevelBadge level={result.targetLevel} name={result.targetLevelName} />
            </div>
          </div>
          {canEdit && !editing && (
            <button
              type="button"
              onClick={() => {
                setLevel(result.targetLevel);
                setEditing(true);
              }}
              className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Изменить
            </button>
          )}
        </div>

        {editing && (
          <div className="mt-4">
            <TargetLevelPicker
              reference={reference}
              value={level}
              onChange={setLevel}
              disabled={saving}
              name="result-target-level"
            />
            {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving || level === result.targetLevel}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-gray-50 px-3 py-2">
            <div className="text-xs text-gray-500">Применимых направлений</div>
            <div className="text-lg font-semibold text-gray-900">
              {result.applicableCount}{' '}
              <span className="text-sm font-normal text-gray-400">
                из {result.directions.length}
              </span>
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 px-3 py-2">
            <div className="text-xs text-gray-500">Ниже целевого уровня</div>
            <div
              className={`text-lg font-semibold ${
                result.belowTargetCount > 0 ? 'text-red-600' : 'text-green-700'
              }`}
            >
              {result.belowTargetCount}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MaturityResultView({
  result,
  reference,
  items,
  canEdit,
  notSubmitted,
  onChangeTarget,
}: {
  result: MaturityResult;
  reference: MaturityReference;
  // ответы подрядчика — для причин неприменимости
  items: MaturityItem[];
  canEdit: boolean;
  // анкета ещё у подрядчика (черновик / на доработке)
  notSubmitted: boolean;
  onChangeTarget: (level: number) => Promise<void>;
}) {
  const applicable = result.directions.filter((d) => !d.notApplicable);
  const notApplicable = result.directions.filter((d) => d.notApplicable);
  const reasonOf = (direction: number) =>
    items.find((i) => i.direction === direction)?.comment?.trim() || 'Причина не указана';

  return (
    <div className="space-y-6">
      {notSubmitted && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          Подрядчик ещё не отправил оценку — результат рассчитан по текущему черновику и
          может измениться.
        </div>
      )}

      <OverallCard
        // после смены цели карточка пересоздаётся с новым значением по умолчанию
        key={result.targetLevel}
        result={result}
        reference={reference}
        canEdit={canEdit}
        onChangeTarget={onChangeTarget}
      />

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800">Профиль зрелости</h3>
        <p className="text-xs text-gray-500 mt-0.5 mb-3">
          По осям — номера применимых направлений (названия — в таблице ниже и в подсказке
          при наведении), шкала уровней 0–4.
        </p>
        <Suspense fallback={<div className="text-sm text-gray-500">Загрузка диаграммы...</div>}>
          <MaturityRadarChart directions={result.directions} />
        </Suspense>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800">Уровни по направлениям</h3>
        </div>
        {applicable.length === 0 ? (
          <div className="p-5 text-sm text-gray-500">Нет применимых направлений.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="px-4 py-3 font-medium text-gray-500 w-10">№</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Направление</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-right">P</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Уровень</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-center">Цель</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-center">Достигнута</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Недостатки</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {applicable.map((d) => (
                  <tr key={d.direction} className="align-top">
                    <td className="px-4 py-3 text-gray-400">{d.direction}</td>
                    <td className="px-4 py-3 text-gray-900 min-w-[200px]">{d.title}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                      {formatNumber(d.p)}
                    </td>
                    <td className="px-4 py-3">
                      <MaturityLevelBadge level={d.level} name={d.levelName} />
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">{d.targetLevel}</td>
                    <td className="px-4 py-3 text-center">
                      {d.meetsTarget ? (
                        <span className="text-green-700 font-medium" title="Достигнута">
                          ✓ да
                        </span>
                      ) : (
                        <span className="text-red-600 font-medium" title="Не достигнута">
                          ✗ нет
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 min-w-[160px]">
                      {d.gapTitles.length === 0 ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {d.gapTitles.map((g) => (
                            <span
                              key={g}
                              className="px-2 py-0.5 rounded bg-red-50 border border-red-100 text-xs text-red-700"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {notApplicable.length > 0 && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-600">
              Неприменимые направления ({notApplicable.length})
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Исключены из расчёта.</p>
          </div>
          <ul className="divide-y divide-gray-200">
            {notApplicable.map((d) => (
              <li key={d.direction} className="px-5 py-3 text-sm">
                <div className="text-gray-600">
                  <span className="text-gray-400 mr-2">{d.direction}</span>
                  {d.title}
                </div>
                <div className="mt-0.5 text-xs text-gray-500">
                  Причина: {reasonOf(d.direction)}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
