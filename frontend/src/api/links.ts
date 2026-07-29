import api from './client';
import type { Answer, LinkByToken, QuestionnaireLink } from '../types';

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
