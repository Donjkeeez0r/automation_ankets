import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { saveMaturityByToken } from '../../api/maturity';
import { submitByToken } from '../../api/links';
import DirectionCard from '../../components/maturity/DirectionCard';
import DirectionFields from '../../components/maturity/DirectionFields';
import {
  apiErrorMessage,
  directionStatus,
  draftToInput,
  emptyDraft,
  filledCount,
  isDirectionDone,
  maturityProblems,
  problemDirections,
  problemsText,
  scrollToDirection,
  toDrafts,
  useMaturityReference,
  type MaturityDraft,
  type MaturityDrafts,
} from '../../lib/maturity';
import { isAlreadySubmittedError } from '../../lib/linkErrors';
import type { MaturityItem } from '../../types/maturity';

// Пауза после последнего изменения, после которой черновик уходит на сервер
const AUTOSAVE_DELAY_MS = 1500;

type SaveState = 'saved' | 'dirty' | 'saving' | 'error';

const SAVE_STATE_VIEW: Record<SaveState, { text: string; classes: string }> = {
  saved: { text: 'Сохранено ✓', classes: 'text-emerald-700' },
  dirty: { text: 'Есть несохранённые изменения', classes: 'text-gray-500' },
  saving: { text: 'Сохранение…', classes: 'text-gray-500' },
  error: { text: 'Не удалось сохранить', classes: 'text-red-600' },
};

export default function MaturityFillForm({
  token,
  items,
  artifactsBlock,
  onSubmitted,
}: {
  token: string;
  items: MaturityItem[] | undefined;
  // общий блок загрузки подтверждающих файлов (из FillPage)
  artifactsBlock: ReactNode;
  onSubmitted: () => void;
}) {
  const { reference, error: referenceError, retry } = useMaturityReference();

  const [drafts, setDrafts] = useState<MaturityDrafts>(() => toDrafts(items));
  const draftsRef = useRef(drafts);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [problems, setProblems] = useState<Set<number>>(new Set());

  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Направления, изменённые после последнего успешного сохранения
  const dirtyRef = useRef<Set<number>>(new Set());
  const timerRef = useRef<number | undefined>(undefined);
  // Сохранения выполняются строго по очереди, чтобы ответы не обгоняли друг друга
  const chainRef = useRef<Promise<boolean>>(Promise.resolve(true));
  // Запрос сохранения ещё не завершился
  const savingRef = useRef(false);
  // Последнее сохранение завершилось ошибкой
  const saveFailedRef = useRef(false);

  const draftOf = (direction: number): MaturityDraft => drafts[direction] ?? emptyDraft();

  const flush = useCallback((): Promise<boolean> => {
    window.clearTimeout(timerRef.current);
    const run = async (): Promise<boolean> => {
      const directions = [...dirtyRef.current];
      if (directions.length === 0) return true;
      dirtyRef.current = new Set();
      savingRef.current = true;
      setSaveState('saving');
      try {
        await saveMaturityByToken(
          token,
          directions.map((d) => draftToInput(d, draftsRef.current[d] ?? emptyDraft())),
        );
        saveFailedRef.current = false;
        setSaveState(dirtyRef.current.size > 0 ? 'dirty' : 'saved');
        return true;
      } catch (err) {
        directions.forEach((d) => dirtyRef.current.add(d));
        saveFailedRef.current = true;
        setSaveState('error');
        if (isAlreadySubmittedError(err)) onSubmitted();
        else setError(apiErrorMessage(err, 'Не удалось сохранить ответы. Проверьте соединение.'));
        return false;
      } finally {
        savingRef.current = false;
      }
    };
    chainRef.current = chainRef.current.then(run);
    return chainRef.current;
  }, [token, onSubmitted]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  // Предупреждаем при закрытии вкладки: есть несохранённые изменения,
  // сохранение ещё идёт или последнее сохранение не удалось
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current.size === 0 && !savingRef.current && !saveFailedRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const update = (direction: number, patch: Partial<MaturityDraft>) => {
    const next = {
      ...draftsRef.current,
      [direction]: { ...(draftsRef.current[direction] ?? emptyDraft()), ...patch },
    };
    draftsRef.current = next;
    setDrafts(next);
    dirtyRef.current.add(direction);
    setSaveState('dirty');
    setError('');
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);
  };

  const toggle = (direction: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(direction)) next.delete(direction);
      else next.add(direction);
      return next;
    });

  const directions = useMemo(() => reference?.directions ?? [], [reference]);
  const doneCount = directions.filter((d) => isDirectionDone(draftOf(d.id))).length;
  // Подсвеченные после неудачной отправки и ещё не исправленные направления
  const attentionCount = directions.filter(
    (d) => problems.has(d.id) && !isDirectionDone(draftOf(d.id)),
  ).length;

  const handleSave = async () => {
    setError('');
    await flush();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      if (!(await flush())) return;
      await submitByToken(token);
      onSubmitted();
    } catch (err) {
      if (isAlreadySubmittedError(err)) {
        onSubmitted();
        return;
      }
      const found = maturityProblems(err);
      if (!found) {
        setError(apiErrorMessage(err, 'Не удалось отправить оценку'));
        return;
      }
      const all = problemDirections(found);
      setProblems(new Set(all));
      setExpanded((prev) => new Set([...prev, ...all]));
      setError(`Оценка заполнена не полностью: ${problemsText(found)}. Направления подсвечены ниже.`);
      scrollToDirection(all[0]);
    } finally {
      setSubmitting(false);
    }
  };

  if (referenceError) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm">
        <div className="text-red-600">{referenceError}</div>
        <button
          type="button"
          onClick={retry}
          className="mt-3 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          Повторить
        </button>
      </div>
    );
  }

  if (!reference) {
    return <div className="text-sm text-gray-500">Загрузка направлений...</div>;
  }

  const total = directions.length;
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const allExpanded = expanded.size === total;
  const saveView = SAVE_STATE_VIEW[saveState];

  return (
    <div>
      {/* Прогресс и статус сохранения остаются на виду при прокрутке */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-3 mb-4 bg-gray-50/95 backdrop-blur border-b border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
          <span className="font-medium text-gray-800">
            Заполнено {doneCount} из {total}
          </span>
          <span className={`text-xs ${saveView.classes}`} aria-live="polite">
            {saveView.text}
          </span>
        </div>
        <div
          className="mt-2 h-1.5 rounded-full bg-gray-200 overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={doneCount}
          aria-label="Прогресс заполнения"
        >
          <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
        {attentionCount > 0 && (
          <div className="mt-2 text-xs font-medium text-red-600">
            Требуют внимания: {attentionCount} — направления подсвечены красным
          </div>
        )}
      </div>

      <div className="flex justify-end mb-3">
        <button
          type="button"
          onClick={() =>
            setExpanded(allExpanded ? new Set() : new Set(directions.map((d) => d.id)))
          }
          className="text-xs font-medium text-blue-600 hover:underline"
        >
          {allExpanded ? 'Свернуть все' : 'Развернуть все'}
        </button>
      </div>

      {/* Пока идёт отправка, поля заблокированы: иначе правка после последнего
          сохранения потерялась бы — ссылка деактивируется сразу после submit */}
      <fieldset disabled={submitting} className="space-y-3 min-w-0">
        {directions.map((d) => {
          const draft = draftOf(d.id);
          const highlighted = problems.has(d.id) && !isDirectionDone(draft);
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
            >
              <DirectionFields
                direction={d.id}
                reference={reference}
                draft={draft}
                onChange={(patch) => update(d.id, patch)}
                showMissing={highlighted}
              />
            </DirectionCard>
          );
        })}
      </fieldset>

      <div className="mt-6">{artifactsBlock}</div>

      {error && (
        <div role="alert" className="mt-6 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      <p className="mt-6 text-xs text-gray-500 sm:text-right">
        После отправки оценку нельзя будет редактировать до решения проверяющего.
      </p>
      <div className="mt-3 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saveState === 'saving' || submitting}
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          {saveState === 'saving' ? 'Сохранение...' : 'Сохранить черновик'}
        </button>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Отправка...' : 'Отправить на проверку'}
        </button>
      </div>
    </div>
  );
}
