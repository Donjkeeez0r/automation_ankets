import { randomInt } from 'crypto';
import { Role } from '../generated/prisma';

// Длина генерируемого пароля по роли — единственное место, где задаются числа.
const PASSWORD_LENGTH_BY_ROLE: Record<Role, number> = {
  [Role.ADMIN]: 14,
  [Role.EMPLOYEE]: 12,
};

export function passwordLengthForRole(role: Role): number {
  return PASSWORD_LENGTH_BY_ROLE[role];
}

// Наборы без неоднозначных символов: нет 0/O/o, 1/l/I/i.
const LOWER = 'abcdefghjkmnpqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const SPECIAL = '!@#$%^&*-_=+?';
const ALL = LOWER + UPPER + DIGITS + SPECIAL;

const pick = (chars: string) => chars[randomInt(chars.length)];

// Пароль из криптостойкого источника (crypto.randomInt), гарантированно
// содержит строчную и заглавную букву, цифру и спецсимвол.
export function generatePassword(role: Role): string {
  const length = passwordLengthForRole(role);
  const chars = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SPECIAL)];
  while (chars.length < length) chars.push(pick(ALL));

  // Перемешивание Фишера–Йетса, чтобы обязательные символы не стояли в начале.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
