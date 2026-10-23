import type { QuestionnaireType } from '../types';

// Путь страницы проверки анкеты: у оценки зрелости свой раздел в меню,
// чтобы при открытии подсвечивался нужный пункт.
export const questionnairePath = (q: { id: string; type?: QuestionnaireType }) =>
  q.type === 'MATURITY' ? `/maturity/${q.id}` : `/questionnaires/${q.id}`;
