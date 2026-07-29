import api from './client';
import type { Role } from '../types';

export interface LoginResponse {
  access_token: string;
}

export const login = (email: string, password: string) =>
  api.post<LoginResponse>('/auth/login', { email, password });

export const register = (data: {
  email: string;
  password: string;
  name: string;
  organization: string;
  role: Role;
}) => api.post<LoginResponse>('/auth/register', data);
