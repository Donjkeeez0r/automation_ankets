export type Role = 'CONTRACTOR' | 'EMPLOYEE';

export type Status =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'DECLINED'
  | 'REVISION';

export type QuestionType =
  | 'text'
  | 'yesno'
  | 'yesno_na'
  | 'yesno_partial'
  | 'yesno_arch'
  | 'yesno_nowork';

export interface User {
  userId: string;
  email: string;
  name: string;
  organization: string;
  role: Role;
}

export interface Question {
  id: string;
  code: string;
  text: string;
  section: string;
  type: QuestionType;
  order: number;
}

export interface Answer {
  questionId: string;
  value: string;
  additionalValue?: string;
}

export interface Questionnaire {
  id: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
  contractorId: string;
  employeeId: string;
  comment?: string;
  contractor?: {
    name: string;
    organization: string;
    email: string;
  };
  answers?: Array<{
    questionId: string;
    value: string;
    additionalValue?: string;
    question: Question;
  }>;
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

export interface Me {
  id: string;
  email: string;
  name: string;
  organization: string;
  role: Role;
  createdAt: string;
}

export interface Contractor {
  id: string;
  name: string;
  email: string;
  organization: string;
}
