import { lazy, Suspense, useState } from 'react';
import MaturityLevelBadge from './MaturityLevelBadge';
import MaturityTargetPicker from './MaturityTargetPicker';
import { apiErrorMessage, formatNumber, formatP, levelColor } from '../../lib/maturity';
import type {
  MaturityReference,
  MaturityResult,
  MaturityTarget,
} from '../../types/maturity';

// recharts заметно тяжёлый — грузим его отдельным чанком только на странице
// результата, чтобы не утяжелять остальное приложение и форму подрядчика
const MaturityRadarChart = lazy(() => import('./MaturityRadarChart'));

// «из 1 направления», «из 5 направлений»
function directionsOf(n: number): string {
  return n % 10 === 1 && n % 100 !== 11 ? 'направления' : 'направлений';
}

function OverallCard({
  result,
  reference,
  canEditTarget,
  onChangeTarget,
}: {
  result: MaturityResult;
  reference: MaturityReference;
  canEditTarget: boolean;
  onChangeTarget: (target: MaturityTarget) => Promise<void>;
}) {
  const current: MaturityTarget = {
    targetLevel: result.targetLevel,
    objectCategory: result.objectCategory,
  };
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState<MaturityTarget>(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const color = levelColor(result.overallLevel);
  // цель по методике задаётся для каждого направления (п. 14), поэтому
  // сравниваем не общий Узи, а число направлений, достигших цели
  const metCount = result.applicableCount - result.belowTargetCount;

  const unchanged =
    target.targetLevel === current.targetLevel &&
    target.objectCategory === current.objectCategory;
  const belowRecommended =
    result.recommendedLevel !== null && result.targetLevel < result.recommendedLevel;

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await onChangeTarget(target);
      setEditing(false);
    } catch (err) {
      setError(apiErrorMessage(err, 'Не удалось изменить параметры оценки'));
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
        {result.overallLevelDescription && (
          <p className="mt-2 text-xs text-gray-600">{result.overallLevelDescription}</p>
        )}
      </div>

      <div className="sm:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium text-gray-500">Целевой уровень</div>
            <div className="mt-1 flex items-start gap-2 text-sm">
              <span
                aria-hidden="true"
                className="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: levelColor(result.targetLevel).hex }}
              />
              <span>
                <span className="font-semibold text-gray-900">
                  {result.targetLevel} — {result.targetLevelName}
                </span>
                {result.objectCategoryLabel && (
                  <span className="text-gray-600"> ({result.objectCategoryLabel})</span>
                )}
                {belowRecommended && (
                  <span className="ml-2 text-xs text-gray-400 whitespace-nowrap">
                    ниже рекомендуемого (не ниже {result.recommendedLevel})
                  </span>
                )}
              </span>
            </div>
          </div>
          {canEditTarget && !editing && (
            <button
              type="button"
              onClick={() => {
                setTarget(current);
                setError('');
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
            <MaturityTargetPicker
              reference={reference}
              value={target}
              onChange={setTarget}
              disabled={saving}
              name="result-target-level"
            />
            {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving || unchanged}
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
          {result.applicableCount > 0 && (
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <div className="text-xs text-gray-500">Достигли цели</div>
              <div
                className={`text-lg font-semibold ${
                  result.belowTargetCount > 0 ? 'text-red-600' : 'text-green-700'
                }`}
              >
                {metCount} из {result.applicableCount}{' '}
                <span className="text-sm font-normal text-gray-400">
                  {directionsOf(result.applicableCount)}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {result.belowTargetCount > 0
                  ? `${result.belowTargetCount} ниже цели`
                  : 'все направления'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MaturityResultView({
  result,
  reference,
  canEditTarget,
  notSubmitted,
  onChangeTarget,
}: {
  result: MaturityResult;
  reference: MaturityReference;
  // можно менять целевой уровень и тип систем (не после решения по анкете)
  canEditTarget: boolean;
  // анкета ещё у подрядчика (черновик / на доработке)
  notSubmitted: boolean;
  onChangeTarget: (target: MaturityTarget) => Promise<void>;
}) {
  const applicable = result.directions.filter((d) => !d.notApplicable);
  const notApplicable = result.directions.filter((d) => d.notApplicable);

  return (
    <div className="space-y-6">
      {notSubmitted && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          Подрядчик ещё не отправил оценку — результат рассчитан по текущему черновику и
          может измениться.
        </div>
      )}

      <OverallCard
        // после смены параметров карточка пересоздаётся с новыми значениями по умолчанию
        key={`${result.targetLevel}|${result.objectCategory ?? ''}`}
        result={result}
        reference={reference}
        canEditTarget={canEditTarget}
        onChangeTarget={onChangeTarget}
      />

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800">Профиль зрелости</h3>
        <p className="text-xs text-gray-500 mt-0.5 mb-3">
          Сплошная область — текущий уровень, пунктир — целевой. Номера осей — номера
          направлений по методике.
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
                      {formatP(d.p)}
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
                  Причина: {d.comment?.trim() || 'Причина не указана'}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
