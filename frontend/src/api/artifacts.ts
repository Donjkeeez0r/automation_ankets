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

// Подрядчик скачивает файл анкеты (гарантийное письмо) по токену ссылки —
// авторизованный /artifacts/:id/download ему недоступен.
export const downloadArtifactByToken = (token: string, artifactId: string) =>
  publicApi.get<Blob>(`/links/${token}/artifacts/${artifactId}/download`, {
    responseType: 'blob',
  });

// У client.ts в defaults жёстко прописан 'Content-Type: application/json',
// и он перебивает multipart-заголовок, который axios выставил бы для FormData.
// Без boundary multer не находит поле file — гасим заголовок на этих запросах,
// чтобы axios проставил 'multipart/form-data; boundary=...' сам.
const MULTIPART = { headers: { 'Content-Type': undefined } };

// EMPLOYEE / AUDITOR
export const uploadArtifact = (
  questionnaireId: string,
  file: File,
  questionId?: string,
) => {
  const form = new FormData();
  form.append('file', file);
  if (questionId) form.append('questionId', questionId);
  return api.post<Artifact>(
    `/artifacts/questionnaire/${questionnaireId}`,
    form,
    MULTIPART,
  );
};

// Гарантийное письмо: тот же upload, но с пометкой type=guarantee_letter,
// чтобы подрядчик увидел его отдельным блоком на странице заполнения.
export const uploadGuaranteeLetter = (questionnaireId: string, file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.post<Artifact>(
    `/artifacts/questionnaire/${questionnaireId}/guarantee-letter`,
    form,
    MULTIPART,
  );
};

export const getArtifacts = (questionnaireId: string) =>
  api.get<Artifact[]>(`/artifacts/questionnaire/${questionnaireId}`);

// Скачивание требует JWT, поэтому простой <a href> не подходит —
// тянем файл через axios и отдаём браузеру как blob.
export const downloadArtifact = (id: string) =>
  api.get<Blob>(`/artifacts/${id}/download`, { responseType: 'blob' });

export const deleteArtifact = (id: string) => api.delete(`/artifacts/${id}`);

// Общий хелпер: тянем файл через axios как blob и отдаём браузеру
// временным object URL — оба download-эндпоинта отдают вложение потоком.
export const saveBlobAs = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
};
