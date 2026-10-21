import api from './client';

export interface LoginResponse {
  access_token: string;
}

export const login = (email: string, password: string) =>
  api.post<LoginResponse>('/auth/login', { email, password });
