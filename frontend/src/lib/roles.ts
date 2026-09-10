import type { Role } from '../types';

// Стартовая страница после входа в зависимости от роли
export function landingPath(role?: Role): string {
  switch (role) {
    case 'ADMIN':
      return '/users';
    case 'EMPLOYEE':
      return '/companies';
    default:
      return '/profile';
  }
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Администратор',
  EMPLOYEE: 'Ответственный за скоринг',
};
