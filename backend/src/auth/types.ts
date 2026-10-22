import { Role } from '../generated/prisma';

// Пользователь, которого JwtStrategy.validate кладёт в request.user
export interface AuthUser {
  userId: string;
  email: string;
  role: Role;
}
