import api from './client';
import type {
  Answer,
  ContractorEmployee,
  LinkByToken,
  QuestionnaireLink,
} from '../types';

// EMPLOYEE: сгенерировать одноразовую ссылку для анкеты
export const createLink = (questionnaireId: string) =>
  api.post<QuestionnaireLink>(`/links/questionnaire/${questionnaireId}`);

// Подрядчик (без авторизации): получить анкету по токену
export const getLinkByToken = (token: string) =>
  api.get<LinkByToken>(`/links/${token}`);

export const saveAnswersByToken = (token: string, answers: Answer[]) =>
  api.post(`/links/${token}/answers`, { answers });

export const submitByToken = (token: string) =>
  api.post(`/links/${token}/submit`);

// Список сотрудников компании — подрядчик выбирает себя перед заполнением
export const getEmployeesByToken = (token: string) =>
  api.get<ContractorEmployee[]>(`/links/${token}/employees`);

export const selectEmployeeByToken = (token: string, employeeId: string) =>
  api.post(`/links/${token}/select-employee`, { employeeId });
