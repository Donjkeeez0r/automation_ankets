import api from './client';
import type {
  Questionnaire,
  Question,
  ScoringResult,
  Recommendation,
  Status,
} from '../types';

export const getAllQuestionnaires = () =>
  api.get<Questionnaire[]>('/questionnaire');

export const getQuestionnaire = (id: string) =>
  api.get<Questionnaire>(`/questionnaire/${id}`);

// Публичный эндпоинт — доступен подрядчику без токена
export const getAllQuestions = () =>
  api.get<Question[]>('/questionnaire/questions');

// EMPLOYEE: создать анкету для компании
export const createQuestionnaire = (companyId: string) =>
  api.post<Questionnaire>('/questionnaire', { companyId });

export const getScoring = (id: string) =>
  api.get<ScoringResult>(`/questionnaire/${id}/scoring`);

export const getRecommendations = (id: string) =>
  api.get<Recommendation[]>(`/questionnaire/${id}/recommendations`);

// AUDITOR: сменить статус анкеты (deadlineAt — ISO-строка, только для REVISION)
export const updateStatus = (
  id: string,
  status: Status,
  comment?: string,
  deadlineAt?: string,
) =>
  api.patch<Questionnaire>(`/questionnaire/${id}/status`, {
    status,
    comment,
    deadlineAt,
  });

// AUDITOR: удалить анкету со всей историей
export const deleteQuestionnaire = (id: string) =>
  api.delete(`/questionnaire/${id}`);
