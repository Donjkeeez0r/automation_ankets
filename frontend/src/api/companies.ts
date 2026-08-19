import api from './client';
import type {
  Company,
  CompanyQuestionnaire,
  ContractorEmployee,
  ContractorStatus,
} from '../types';

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

// Сотрудники компании-подрядчика: из них подрядчик выбирает себя на FillPage
export const getCompanyEmployees = (id: string) =>
  api.get<ContractorEmployee[]>(`/companies/${id}/employees`);

// EMPLOYEE: добавить сотрудника компании
export const addCompanyEmployee = (
  id: string,
  data: { name: string; position?: string; email?: string },
) => api.post<ContractorEmployee>(`/companies/${id}/employees`, data);

// EMPLOYEE: удалить сотрудника компании
export const deleteCompanyEmployee = (employeeId: string) =>
  api.delete(`/companies/employees/${employeeId}`);

// EMPLOYEE / AUDITOR: сменить статус подрядчика
export const updateCompanyStatus = (id: string, status: ContractorStatus) =>
  api.patch<Company>(`/companies/${id}/status`, { status });
