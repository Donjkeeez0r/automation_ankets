export type Role = 'ADMIN' | 'EMPLOYEE' | 'AUDITOR';

export type Status =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'DECLINED'
  | 'REVISION'

// Статус подрядчика, выставляется вручную (EMPLOYEE / AUDITOR)
export type ContractorStatus = 'GREEN' | 'YELLOW' | 'RED' | 'NONE';

export type QuestionType =
  | 'text'
  | 'yesno'
  | 'yesno_na'
  | 'yesno_partial'
  | 'yesno_arch'
  | 'yesno_nowork';

// Пользователь из JWT (ADMIN / EMPLOYEE / AUDITOR). Подрядчик аккаунта не имеет.
export interface User {
  userId: string;
  email: string;
  name: string;
  organization: string;
  role: Role;
}

export interface Me {
  id: string;
  email: string;
  name: string;
  organization: string;
  role: Role;
  createdAt: string;
}

// Пользователь в таблице управления (ADMIN)
export interface ManagedUser {
  id: string;
  email: string;
  name: string;
  organization: string;
  role: Role;
  createdAt: string;
}

export interface CreatedUser extends ManagedUser {
  generatedPassword: string;
}

// Компания-подрядчик (создаёт EMPLOYEE)
export interface Company {
  id: string;
  name: string;
  inn?: string | null;
  contactName: string;
  contactEmails: string[];
  createdAt?: string;
  status: ContractorStatus;
}

export interface CompanyRef {
  name: string;
  inn?: string | null;
  contactName: string;
  contactEmails: string[];
}

// Сотрудник компании-подрядчика — тот, кто может заполнить анкету
export interface ContractorEmployee {
  id: string;
  name: string;
  position?: string | null;
  email?: string | null;
}

export interface Question {
  id: string;
  code: string;
  text: string;
  section: string;
  type: QuestionType;
  order: number;
  required: boolean;
}

// Индивидуальное переопределение обязательности вопроса для конкретной анкеты
export interface QuestionOverride {
  questionId: string;
  required: boolean;
}

export interface Answer {
  questionId: string;
  value: string;
  additionalValue?: string;
}

export interface AnswerWithQuestion {
  questionId: string;
  value: string;
  additionalValue?: string;
  question: Question;
}

export interface Questionnaire {
  id: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
  companyId: string;
  employeeId: string;
  comment?: string | null;
  deadlineAt?: string | null;
  company?: CompanyRef;
  answers?: AnswerWithQuestion[];
  filledByEmployee?: ContractorEmployee | null;
}

export interface QuestionnaireLink {
  id: string;
  token: string;
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
  questionnaireId: string;
}

// Ссылка внутри списка анкет компании (без questionnaireId)
export interface CompanyLink {
  id: string;
  token: string;
  isActive: boolean;
  expiresAt: string;
  createdAt: string;
}

// Анкета компании с её ссылками (GET /companies/:id/questionnaires)
export interface CompanyQuestionnaire {
  id: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
  comment?: string | null;
  deadlineAt?: string | null;
  links: CompanyLink[];
}

// Анкета, полученная подрядчиком по токену (GET /links/:token)
export interface LinkQuestionnaire {
  id: string;
  status: Status;
  comment?: string | null;
  company?: CompanyRef;
  answers?: Answer[];
  overrides?: QuestionOverride[];
  filledByEmployee?: ContractorEmployee | null;
}

export interface LinkByToken {
  id: string;
  token: string;
  questionnaireId: string;
  expiresAt: string;
  isActive: boolean;
  questionnaire: LinkQuestionnaire;
}

// Файл-артефакт, прикреплённый к анкете
export interface Artifact {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  questionId?: string | null;
}

export interface ScoringResult {
  id: string;
  questionnaireId: string;
  auditScore: number | null;
  documentScore: number | null;
  measuresScore: number | null;
  gisScore: number | null;
  pdnScore: number | null;
  remoteAccessScore: number | null;
  devScore: number | null;
  contractorsScore: number | null;
  recommended: boolean;
}

export interface Recommendation {
  category: string;
  text: string;
}
