import api from './client';
import type { Company, CompanyQuestionnaire } from '../types';

export const getCompanies = () => api.get<Company[]>('/companies');

export const getCompanyQuestionnaires = (id: string) =>
  api.get<CompanyQuestionnaire[]>(`/companies/${id}/questionnaires`);

export const createCompany = (data: {
  name: string;
  inn?: string;
  contactName: string;
  contactEmails: string[];
}) => api.post<Company>('/companies', data);

// EMPLOYEE: отредактировать компанию (все поля опциональны)
export const updateCompany = (
  id: string,
  data: {
    name?: string;
    inn?: string;
    contactName?: string;
    contactEmails?: string[];
  },
) => api.patch<Company>(`/companies/${id}`, data);

// AUDITOR: удалить компанию вместе со всеми её анкетами (каскад)
export const deleteCompany = (id: string) => api.delete(`/companies/${id}`);
