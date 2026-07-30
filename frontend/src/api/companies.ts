import api from './client';
import type { Company, CompanyQuestionnaire } from '../types';

export const getCompanies = () => api.get<Company[]>('/companies');

export const getCompanyQuestionnaires = (id: string) =>
  api.get<CompanyQuestionnaire[]>(`/companies/${id}/questionnaires`);

export const createCompany = (data: {
  name: string;
  inn?: string;
  contactName: string;
  contactEmail: string;
}) => api.post<Company>('/companies', data);
