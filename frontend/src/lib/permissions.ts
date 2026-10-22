import type { User } from '../types';

// Права в интерфейсе повторяют проверки бэкенда (см. docs/ROLES.md).
// Здесь они нужны только для того, чтобы не показывать недоступные кнопки:
// сами права всё равно проверяет сервер.

export const isAdmin = (user: User | null | undefined) => user?.role === 'ADMIN';

export const isEmployee = (user: User | null | undefined) =>
  user?.role === 'EMPLOYEE';

// Изменять анкету может только закреплённый за ней ответственный за скоринг
export const canEditQuestionnaire = (
  user: User | null | undefined,
  questionnaire: { employeeId: string },
) => isEmployee(user) && user?.userId === questionnaire.employeeId;

// Удалять — закреплённый ответственный или администратор
export const canDeleteQuestionnaire = (
  user: User | null | undefined,
  questionnaire: { employeeId: string },
) => isAdmin(user) || canEditQuestionnaire(user, questionnaire);
