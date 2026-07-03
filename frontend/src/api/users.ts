import api from './client';
import type { Contractor, Me } from '../types';

export const getContractors = () =>
  api.get<Contractor[]>('/users/contractors');

export const getMe = () => api.get<Me>('/users/me');
