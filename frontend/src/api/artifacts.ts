import axios from 'axios';
import api from './client';
import type { Artifact } from '../types';

// Подрядчик (без авторизации): загрузить файл по токену ссылки.
// Отдельный инстанс axios без интерсепторов client.ts — публичной странице
// не нужен заголовок Authorization, а редирект на /login при 401 сломал бы
// заполнение анкеты.
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
});

export const uploadArtifactByToken = (
  token: string,
  file: File,
  questionId?: string,
) => {
  const form = new FormData();
  form.append('file', file);
  if (questionId) form.append('questionId', questionId);
  return publicApi.post<Artifact>(`/links/${token}/artifacts`, form);
};

export const getArtifactsByToken = (token: string) =>
  publicApi.get<Artifact[]>(`/links/${token}/artifacts`);

export const deleteArtifactByToken = (token: string, artifactId: string) =>
  publicApi.delete(`/links/${token}/artifacts/${artifactId}`);

// EMPLOYEE / AUDITOR
export const uploadArtifact = (
  questionnaireId: string,
  file: File,
  questionId?: string,
) => {
  const form = new FormData();
  form.append('file', file);
  if (questionId) form.append('questionId', questionId);
  return api.post<Artifact>(`/artifacts/questionnaire/${questionnaireId}`, form);
};

export const getArtifacts = (questionnaireId: string) =>
  api.get<Artifact[]>(`/artifacts/questionnaire/${questionnaireId}`);

// Скачивание требует JWT, поэтому простой <a href> не подходит —
// тянем файл через axios и отдаём браузеру как blob.
export const downloadArtifact = (id: string) =>
  api.get<Blob>(`/artifacts/${id}/download`, { responseType: 'blob' });

export const deleteArtifact = (id: string) => api.delete(`/artifacts/${id}`);

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
};
