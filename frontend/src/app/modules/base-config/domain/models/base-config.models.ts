export interface RoleRecord {
  id: number;
  name: string;
  description?: string | null;
}

export interface CareerRecord {
  id: number;
  name: string;
  code: string;
  faculty_id: number;
  description?: string | null;
}

export interface UserRecord {
  id: number;
  name: string;
  surname: string;
  code: string;
  email: string;
  active: boolean;
  role_id: number;
  career_id: number;
  subject_ids: number[];
  created_at?: string | null;
}

export interface UserPayload {
  name: string;
  surname: string;
  code: string;
  email: string;
  password?: string;
  role_id: number;
  career_id: number;
  subject_ids: number[];
}

export interface StudentOutcomeRecord {
  id: number;
  code: string;
  description?: string | null;
}

export interface ExternalConnection {
  id: number;
  name: string;
  type: string;
  endpoint: string;
  owner: string;
  status: 'conectado' | 'sincronizando' | 'inactivo';
}

export interface AcademicProgram {
  id: number;
  name: string;
  code: string;
  accreditation: string;
  progress: number;
  status: 'acreditado' | 'en-proceso' | 'evaluacion';
}

export interface RubricIndicator {
  id: number;
  code: string;
  description: string;
  n1: string;
  n2: string;
  n3: string;
  n4: string;
}
