import api from './client';
import type { Answer, Questionnaire, Question, ScoringResult, Recommendation, Status } from '../types';

export const getMyQuestionnaires = () =>
  api.get<Questionnaire[]>('/questionnaire/my');

export const getAllQuestionnaires = () =>
  api.get<Questionnaire[]>('/questionnaire');

export const getQuestionnaire = (id: string) =>
  api.get<Questionnaire>(`/questionnaire/${id}`);

export const getAllQuestions = () =>
  api.get<Question[]>('/questionnaire/questions');

export const createQuestionnaire = (contractorId: string) =>
  api.post<Questionnaire>('/questionnaire', { contractorId });

export const saveAnswers = (id: string, answers: Answer[]) =>
  api.post(`/questionnaire/${id}/answers`, { answers });

export const submitQuestionnaire = (id: string) =>
  api.post<Questionnaire>(`/questionnaire/${id}/submit`);

export const getScoring = (id: string) =>
  api.get<ScoringResult>(`/questionnaire/${id}/scoring`);

export const getRecommendations = (id: string) =>
  api.get<Recommendation[]>(`/questionnaire/${id}/recommendations`);

export const getMyRecommendations = (id: string) =>
  api.get<Recommendation[]>(`/questionnaire/${id}/my-recommendations`);

export const updateStatus = (id: string, status: Status, comment?: string) =>
  api.patch<Questionnaire>(`/questionnaire/${id}/status`, { status, comment });
