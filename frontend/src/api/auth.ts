import api from './client';
import type { User } from '../types';

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
  role: 'CONTRACTOR' | 'EMPLOYEE';
}) => api.post<User>('/auth/register', data);
