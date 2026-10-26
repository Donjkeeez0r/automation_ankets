import { useCallback, useEffect, useState } from 'react';
import { getMaturityResult, updateMaturityTargetLevel } from '../../api/maturity';
import { apiErrorMessage, useMaturityReference } from '../../lib/maturity';
import ArtifactsView from '../ArtifactsView';
import ActivityLogView from '../ActivityLogView';
import MaturityResultView from './MaturityResultView';
import MaturityAssessmentsView from './MaturityAssessmentsView';
import type { Questionnaire, Status } from '../../types';
import type {
  MaturityDirectionResult,
  MaturityItem,
  MaturityResult,
  MaturityTarget,
} from '../../types/maturity';

type Tab = 'result' | 'assessments' | 'files' | 'history';

const TABS: { key: Tab; label: string }[] = [
  { key: 'result', label: 'Результат' },
  { key: 'assessments', label: 'Оценки' },
  { key: 'files', label: 'Файлы' },
  { key: 'history', label: 'История' },
];

// Сотрудник правит значения только во время проверки (так же проверяет бэкенд)
const EDITABLE_STATUSES: Status[] = ['SUBMITTED', 'IN_REVIEW'];
const NOT_SUBMITTED_STATUSES: Status[] = ['DRAFT', 'REVISION'];
// После решения параметры оценки зафиксированы (так же проверяет бэкенд)
const LOCKED_STATUSES: Status[] = ['APPROVED', 'DECLINED'];

// Стабильные пустые массивы: новый [] при каждом рендере сбрасывал бы
// несохранённые правки во вкладке «Оценки»
const NO_ITEMS: MaturityItem[] = [];
const NO_DIRECTIONS: MaturityDirectionResult[] = [];

// Вкладки страницы проверки для оценки уровня зрелости (type = MATURITY).
// Скоринга, рекомендаций и обязательности вопросов здесь нет.
export default function MaturityReview({
  questionnaire,
  canEdit,
  historyKey,
  onHistoryChanged,
  onReloadQuestionnaire,
}: {
  questionnaire: Questionnaire;
  canEdit: boolean;
  historyKey: number;
  onHistoryChanged: () => void;
  onReloadQuestionnaire: () => Promise<void>;
}) {
  const { reference, error: referenceError, retry } = useMaturityReference();
  const [tab, setTab] = useState<Tab>('result');
  const [result, setResult] = useState<MaturityResult | null>(null);
  const [resultError, setResultError] = useState('');
  const [reloadWarning, setReloadWarning] = useState('');

  const loadResult = useCallback(async () => {
    setResultError('');
    try {
      const { data } = await getMaturityResult(questionnaire.id);
      setResult(data);
    } catch (err) {
      setResultError(apiErrorMessage(err, 'Не удалось загрузить результат оценки'));
    }
  }, [questionnaire.id]);

  useEffect(() => {
    void loadResult();
  }, [loadResult]);

  // Изменение уже сохранено на сервере: сбой последующей перезагрузки не должен
  // выглядеть как ошибка сохранения (повторный PATCH задвоил бы запись в истории)
  const refreshAfterChange = async () => {
    onHistoryChanged();
    setReloadWarning('');
    try {
      await onReloadQuestionnaire();
    } catch {
      setReloadWarning('Изменения сохранены, но не удалось обновить данные. Обновите страницу.');
    }
    await loadResult();
  };

  const handleChangeTarget = async (target: MaturityTarget) => {
    await updateMaturityTargetLevel(questionnaire.id, target);
    await refreshAfterChange();
  };

  const editable = canEdit && EDITABLE_STATUSES.includes(questionnaire.status);
  const targetEditable = canEdit && !LOCKED_STATUSES.includes(questionnaire.status);
  const readOnlyHint = canEdit
    ? 'Изменять значения можно только пока анкета на проверке.'
    : undefined;

  const needsData = tab === 'result' || tab === 'assessments';

  return (
    <>
      <div className="flex gap-1 mb-4 border-b border-gray-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              tab === t.key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {reloadWarning && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          {reloadWarning}
        </div>
      )}

      {needsData && referenceError && (
        <div className="text-sm text-red-600">
          {referenceError}{' '}
          <button type="button" onClick={retry} className="underline hover:no-underline">
            Повторить
          </button>
        </div>
      )}

      {needsData && !referenceError && !reference && (
        <div className="text-sm text-gray-500">Загрузка...</div>
      )}

      {tab === 'result' &&
        reference &&
        (resultError ? (
          <div className="text-sm text-red-600">{resultError}</div>
        ) : !result ? (
          <div className="text-sm text-gray-500">Загрузка результата...</div>
        ) : (
          <MaturityResultView
            result={result}
            reference={reference}
            canEditTarget={targetEditable}
            notSubmitted={NOT_SUBMITTED_STATUSES.includes(questionnaire.status)}
            onChangeTarget={handleChangeTarget}
          />
        ))}

      {/* Вкладка остаётся смонтированной, чтобы несохранённые правки
          не пропадали при переключении на «Результат» и обратно */}
      {reference && (
        <div hidden={tab !== 'assessments'}>
          <MaturityAssessmentsView
            questionnaireId={questionnaire.id}
            reference={reference}
            items={questionnaire.maturityItems ?? NO_ITEMS}
            resultDirections={result?.directions ?? NO_DIRECTIONS}
            editable={editable}
            readOnlyHint={readOnlyHint}
            onSaved={refreshAfterChange}
          />
        </div>
      )}

      {tab === 'files' && (
        <ArtifactsView questionnaireId={questionnaire.id} canUpload={canEdit} />
      )}

      {tab === 'history' && (
        <ActivityLogView key={historyKey} questionnaireId={questionnaire.id} />
      )}
    </>
  );
}
