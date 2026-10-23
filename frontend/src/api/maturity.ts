import api from './client';
import type {
  MaturityItemInput,
  MaturityReference,
  MaturityResult,
} from '../types/maturity';

// Справочник методики один для всех и не меняется во время работы, поэтому
// грузим его один раз за сессию вкладки и отдаём всем экранам один и тот же
// промис. При ошибке кеш сбрасывается — следующий вызов попробует снова.
let referenceCache: Promise<MaturityReference> | null = null;

export const getMaturityReference = (): Promise<MaturityReference> => {
  if (!referenceCache) {
    referenceCache = api
      .get<MaturityReference>('/maturity/reference')
      .then((r) => r.data)
      .catch((err: unknown) => {
        referenceCache = null;
        throw err;
      });
  }
  return referenceCache;
};

// Подрядчик (по токену ссылки): сохранить черновик — только изменённые направления
export const saveMaturityByToken = (token: string, items: MaturityItemInput[]) =>
  api.post<{ message: string }>(`/links/${token}/maturity`, { items });

// EMPLOYEE: результат расчёта (уровни направлений, Узи, недостатки)
export const getMaturityResult = (questionnaireId: string) =>
  api.get<MaturityResult>(`/questionnaire/${questionnaireId}/maturity/result`);

// EMPLOYEE: правка значений во время проверки (SUBMITTED / IN_REVIEW)
export const updateMaturityItems = (
  questionnaireId: string,
  items: MaturityItemInput[],
) =>
  api.patch<{ message: string }>(`/questionnaire/${questionnaireId}/maturity`, {
    items,
  });

// EMPLOYEE: изменить целевой уровень (в любом статусе)
export const updateMaturityTargetLevel = (
  questionnaireId: string,
  targetLevel: number,
) =>
  api.patch<{ message: string }>(
    `/questionnaire/${questionnaireId}/maturity/target-level`,
    { targetLevel },
  );
