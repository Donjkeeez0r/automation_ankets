import api from './client';
import type {
  Questionnaire,
  Question,
  ScoringResult,
  Recommendation,
  Status,
  QuestionOverride,
  ActivityLogEntry,
} from '../types';

export const getAllQuestionnaires = () =>
  api.get<Questionnaire[]>('/questionnaire');

export const getQuestionnaire = (id: string) =>
  api.get<Questionnaire>(`/questionnaire/${id}`);

// Публичный эндпоинт — доступен подрядчику без токена
export const getAllQuestions = () =>
  api.get<Question[]>('/questionnaire/questions');

// ADMIN: изменить признак обязательности вопроса в общем банке вопросов
export const updateQuestionRequired = (id: string, required: boolean) =>
  api.patch<Question>(`/questionnaire/questions/${id}`, { required });

// EMPLOYEE: создать анкету для компании
export const createQuestionnaire = (companyId: string) =>
  api.post<Questionnaire>('/questionnaire', { companyId });

export const getScoring = (id: string) =>
  api.get<ScoringResult>(`/questionnaire/${id}/scoring`);

export const getRecommendations = (id: string) =>
  api.get<Recommendation[]>(`/questionnaire/${id}/recommendations`);

// EMPLOYEE: история действий по анкете (от новых к старым)
export const getActivityLog = (id: string) =>
  api.get<ActivityLogEntry[]>(`/questionnaire/${id}/activity-log`);

// EMPLOYEE: сменить статус анкеты (deadlineAt — ISO-строка, только для REVISION)
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

// EMPLOYEE: переопределения обязательности вопросов для конкретной анкеты
export const getQuestionOverrides = (id: string) =>
  api.get<QuestionOverride[]>(`/questionnaire/${id}/question-overrides`);

export const setQuestionOverrides = (
  id: string,
  overrides: QuestionOverride[],
) =>
  api.patch<{ message: string }>(`/questionnaire/${id}/question-overrides`, {
    overrides,
  });

// Закреплённый EMPLOYEE или ADMIN: удалить анкету со всей историей
export const deleteQuestionnaire = (id: string) =>
  api.delete(`/questionnaire/${id}`);

// ADMIN: закрепить анкету за другим ответственным за скоринг
export const changeQuestionnaireOwner = (id: string, employeeId: string) =>
  api.patch<Questionnaire>(`/questionnaire/${id}/owner`, { employeeId });

// EMPLOYEE: PDF с рекомендациями. Эндпоинт под JWT, поэтому
// простой <a href> не подойдёт — тянем файл через axios как blob.
export const downloadRecommendationsPdf = (id: string) =>
  api.get<Blob>(`/questionnaire/${id}/recommendations/pdf`, {
    responseType: 'blob',
  });

// Имя файла из Content-Disposition: сначала RFC 5987 (filename*=UTF-8''...),
// затем обычный filename. Возвращает null, если заголовка нет — вызывающий
// код подставит своё имя.
export const parseContentDispositionFileName = (
  disposition?: string,
): string | null => {
  if (!disposition) return null;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (utf8) return decodeURIComponent(utf8[1].trim());
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  return plain ? plain[1].trim() : null;
};

// EMPLOYEE: отправка рекомендаций на email компании. Тела запроса нет —
// сервер сам собирает письмо по анкете и пишет событие в историю.
export const sendRecommendations = (id: string) =>
  api.post<{ message: string }>(`/questionnaire/${id}/send-recommendations`);
