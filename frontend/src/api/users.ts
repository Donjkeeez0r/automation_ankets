import api from './client';
import type { CreatedUser, ManagedUser, Me, Role } from '../types';

export const getMe = () => api.get<Me>('/users/me');

// --- Управление пользователями (ADMIN) ---

export const getUsers = () => api.get<ManagedUser[]>('/users');

export const createUser = (data: {
  email: string;
  name: string;
  organization: string;
  role: Role;
}) => api.post<CreatedUser>('/users', data);

export const updateUser = (
  id: string,
  data: Partial<{
    email: string;
    name: string;
    organization: string;
    role: Role;
  }>,
) => api.patch<ManagedUser>(`/users/${id}`, data);

export const deleteUser = (id: string) => api.delete(`/users/${id}`);

export const resetPassword = (id: string) =>
  api.post<{ generatedPassword: string }>(`/users/${id}/reset-password`);
