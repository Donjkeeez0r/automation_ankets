import { useEffect, useMemo, useState } from 'react';
import DirectionCard from './DirectionCard';
import DirectionFields from './DirectionFields';
import MaturityLevelBadge from './MaturityLevelBadge';
import { updateMaturityItems } from '../../api/maturity';
import {
  apiErrorMessage,
  directionStatus,
  draftProblems,
  draftToInput,
  emptyDraft,
  filledCount,
  formatNumber,
  isDirectionDone,
  isSameDraft,
  maturityProblems,
  problemDirections,
  problemsText,
  scrollToDirection,
  toDrafts,
  type MaturityDraft,
  type MaturityDrafts,
  type MaturityProblems,
} from '../../lib/maturity';
import type {
  MaturityDirectionResult,
  MaturityItem,
  MaturityReference,
} from '../../types/maturity';

// Только просмотр: выбранные варианты полными текстами и комментарий
function DirectionReadOnly({
  reference,
  draft,
}: {
  reference: MaturityReference;
  draft: MaturityDraft;
}) {
  if (draft.notApplicable) {
    return (
      <div className="text-sm text-gray-700">
        <span className="font-medium">Направление неприменимо.</span>{' '}
        Причина: {draft.comment.trim() || <span className="text-red-600">не указана</span>}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <dl className="space-y-3">
        {reference.requirementTypes.map((type, i) => {
          const value = draft[type.key];
          const option = type.options.find((o) => o.value === value);
          return (
            <div key={type.key}>
              <dt className="text-xs font-semibold text-gray-500">
                {i + 1}. {type.title}
              </dt>
              <dd className="mt-0.5 flex items-start gap-3 text-sm">
                <span className={`flex-1 ${option ? 'text-gray-800' : 'text-gray-400'}`}>
                  {option ? option.label : 'Не выбрано'}
                </span>
                <span className="shrink-0 text-xs font-semibold text-gray-500 tabular-nums">
                  {formatNumber(value)}
                </span>
              </dd>
            </div>
          );
        })}
      </dl>
      {draft.comment.trim() && (
        <div className="pt-3 border-t border-gray-100 text-sm text-gray-700">
          <span className="font-medium">Комментарий подрядчика:</span> {draft.comment}
        </div>
      )}
    </div>
  );
}

export default function MaturityAssessmentsView({
  questionnaireId,
  reference,
  items,
  resultDirections,
  editable,
  readOnlyHint,
  onSaved,
}: {
  questionnaireId: string;
  reference: MaturityReference;
  items: MaturityItem[];
  // уровни направлений для бейджа в заголовке блока
  resultDirections: MaturityDirectionResult[];
  // правка разрешена (ответственный + статус SUBMITTED / IN_REVIEW)
  editable: boolean;
  // почему правка недоступна (показывается ответственному)
  readOnlyHint?: string;
  onSaved: () => Promise<void>;
}) {
  const original = useMemo(() => toDrafts(items), [items]);
  const [drafts, setDrafts] = useState<MaturityDrafts>(original);
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // Направления, из-за которых правку нельзя сохранить (оценка стала бы неполной)
  const [problems, setProblems] = useState<Set<number>>(new Set());

  // Свежие данные с сервера (после сохранения) — сбрасываем черновик
  useEffect(() => setDrafts(original), [original]);

  useEffect(() => {
    if (!editable) setEditing(false);
  }, [editable]);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(''), 5000);
    return () => clearTimeout(timer);
  }, [success]);

  const draftOf = (d: number) => drafts[d] ?? emptyDraft();
  const changed = reference.directions
    .map((d) => d.id)
    .filter((d) => !isSameDraft(draftOf(d), original[d] ?? emptyDraft()));

  const toggle = (d: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });

  const cancel = () => {
    setDrafts(original);
    setEditing(false);
    setError('');
    setProblems(new Set());
  };

  // Подсвечиваем проблемные направления, раскрываем их и прокручиваем к первому
  const showProblems = (found: MaturityProblems) => {
    const all = problemDirections(found);
    setProblems(new Set(all));
    setExpanded((prev) => new Set([...prev, ...all]));
    setError(
      `Изменения не сохранены — оценка стала бы неполной: ${problemsText(found)}. Направления подсвечены выше.`,
    );
    scrollToDirection(all[0]);
  };

  const save = async () => {
    if (changed.length === 0) return;
    setError('');
    // Отправленная оценка должна остаться полной — проверяем до запроса
    const found = draftProblems(
      reference.directions.map((d) => d.id),
      draftOf,
    );
    if (found) {
      showProblems(found);
      return;
    }
    setProblems(new Set());
    setSaving(true);
    try {
      const { data } = await updateMaturityItems(
        questionnaireId,
        changed.map((d) => draftToInput(d, draftOf(d))),
      );
      await onSaved();
      setEditing(false);
      setSuccess(data?.message ?? 'Значения обновлены');
    } catch (err) {
      const fromServer = maturityProblems(err);
      if (fromServer) showProblems(fromServer);
      else setError(apiErrorMessage(err, 'Не удалось сохранить изменения'));
    } finally {
      setSaving(false);
    }
  };

  const total = reference.directions.length;
  const allExpanded = expanded.size === total;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="text-sm text-gray-600">
          {editing
            ? 'Режим редактирования: изменения попадут в историю анкеты и пересчитают результат.'
            : 'Оценки подрядчика по направлениям.'}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              setExpanded(allExpanded ? new Set() : new Set(reference.directions.map((d) => d.id)))
            }
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            {allExpanded ? 'Свернуть все' : 'Развернуть все'}
          </button>
          {editable && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Редактировать
            </button>
          )}
        </div>
      </div>

      {!editable && readOnlyHint && (
        <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
          {readOnlyHint}
        </div>
      )}

      {success && (
        <div className="mb-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2">
          {success}
        </div>
      )}

      <div className="space-y-3">
        {reference.directions.map((d) => {
          const draft = draftOf(d.id);
          const res = resultDirections.find((r) => r.direction === d.id);
          const isChanged = editing && changed.includes(d.id);
          const highlighted = editing && problems.has(d.id) && !isDirectionDone(draft);
          return (
            <DirectionCard
              key={d.id}
              direction={d.id}
              title={d.title}
              status={directionStatus(draft)}
              filled={filledCount(draft)}
              expanded={expanded.has(d.id)}
              onToggle={() => toggle(d.id)}
              highlighted={highlighted}
              aside={
                <>
                  {isChanged && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      изменено
                    </span>
                  )}
                  {!editing && res && !res.notApplicable && (
                    <MaturityLevelBadge level={res.level} name={res.levelName} compact />
                  )}
                </>
              }
            >
              {editing ? (
                <DirectionFields
                  direction={d.id}
                  reference={reference}
                  draft={draft}
                  showValues
                  showMissing={highlighted}
                  onChange={(patch) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [d.id]: { ...(prev[d.id] ?? emptyDraft()), ...patch },
                    }))
                  }
                />
              ) : (
                <DirectionReadOnly reference={reference} draft={draft} />
              )}
            </DirectionCard>
          );
        })}
      </div>

      {editing && (
        <div className="sticky bottom-0 mt-4 -mx-1 px-1 py-3 bg-gray-50/95 backdrop-blur border-t border-gray-200">
          {error && <div className="mb-2 text-sm text-red-600">{error}</div>}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="mr-auto text-xs text-gray-500">
              Изменено направлений: {changed.length}
            </span>
            <button
              type="button"
              onClick={cancel}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Отменить
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || changed.length === 0}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
