// ── Auth ──────────────────────────────────────────────────────────────────
export interface LoginRequest  { email: string; password: string; }
export interface TokenResponse { access_token: string; token_type: string; }

export interface CurrentUser {
  id: number;
  name: string;
  email: string;
  document_number: string;
  role_id: number;
  role: 'Admin' | 'Administrativo' | 'Coordinador' | 'Profesor' | 'Auditor';
  program_id: string | null;
  active: boolean;
}

// ── User MS ───────────────────────────────────────────────────────────────
export interface Role     { id: number; name: string; description?: string; }
export interface Permission { id: number; code: string; name: string; description?: string | null; }
export interface Period   { id: number; code: string; }
export interface College  { id: string; name: string; }
export interface Program  { id: string; name: string; college_id: string; accredited: boolean; accreditation_end_year?: number | null; }
export interface Subject  { nrc: number; materia_curso: string; name: string; periods_id: number; program_id: string; }

export interface User {
  id: number;
  document_number: string;
  name: string;
  email: string | null;
  active: boolean;
  role_id: number;
  program_id: string | null;
  accredited?: boolean | null;
  created_at?: string;
}

export interface UserCreate {
  document_number: string; name: string; email?: string | null; password: string;
  role_id: number; program_id?: string | null; accredited?: boolean | null;
}

// ── Assesment MS ──────────────────────────────────────────────────────────
export interface StudentOutcome {
  id: string;
  description: string;
  college_id: string;
}

export interface Performance {
  id: string;
  description: string;
  so_id: string;
}

export interface Level {
  id: string;
  description: string;
  rank: number;
  performance_id: string;
}

export interface Rubric {
  id: number;
  schedule_id: number;
  evaluator_user_id: number;
  student_id: number;
  subjects_id: number;
  performance_id: string;
  level_id: string;
  evidence_id: number | null;
  created_at: string;
}

export interface Evidence {
  id: number;
  schedule_id: number;
  subjects_id: number;
  student_id: number;
  name: string;
  file_url: string;
  mime_type?: string | null;
  uploaded_by: number;
  created_at?: string;
}

export interface TeacherSubject {
  id: number;
  user_id: number;
  subjects_id: number;
  assigned_by: number | null;
  created_at: string;
}

// Asignación + datos de la materia (lo que devuelve GET /teacher-subjects?user_id=).
// Trae el id de la asignación para poder borrarla (CRUD en la UI).
export interface TeacherSubjectDetail {
  id: number;
  user_id: number;
  subjects_id: number;
  materia_curso: string;
  name: string;
  periods_id: number;
  program_id: string;
}

export interface Student {
  id: number;
  document_number: string;
  name: string;
  program_id: string;
  created_by: number | null;
  created_at: string;
}

export type ScheduleStatus = 'PLANIFICADO' | 'EN_CURSO' | 'CERRADO';

export interface SoSchedule {
  id: number;
  so_id: string;
  period_id: number;
  coordinator_user_id: number;
  status: ScheduleStatus;
  created_at: string;
  updated_by: number | null;
  updated_at: string | null;
}

export interface MyAssessment {
  schedule_id: number;
  so_id: string;
  description: string;
  nrc: number;
  period_id: number;
}

export interface ChartLevelItem {
  performance_id: string;
  rank: number;
  level_id: string;
  total: number;
}

export interface IndicatorsChart {
  period_id: number;
  items: ChartLevelItem[];
}

// ── Dashboards de avance (F2) ─────────────────────────────────────────────
export interface ProgramProgressItem { program_id: string; expected: number; done: number; }
export interface SoProgressItem      { so_id: string;       expected: number; done: number; }
export interface TeacherProgressItem { evaluator_user_id: number; expected: number; done: number; }

export interface DashboardProgramResponse {
  period_id: number; expected: number; done: number; items: ProgramProgressItem[];
}
export interface DashboardSoResponse {
  period_id: number; expected: number; items: SoProgressItem[];
}
export interface DashboardTeacherResponse {
  period_id: number; expected: number; done: number; items: TeacherProgressItem[];
}

export interface StudentUploadRow {
  document_number: string;
  name: string;
}

// NOTA: el documento F1 nombró este campo 'existing', pero el backend v13
// realmente devuelve 'already_existed' (User_MS StudentUploadResult). Como F1
// prohíbe tocar el backend y define la API como fuente de verdad, se tipa
// según la respuesta real. Confirmado con el usuario.
export interface StudentUploadResult {
  created: number;
  already_existed: number;
  enrolled: number;
}

// ── UI helpers ────────────────────────────────────────────────────────────
export type AssesmentStatus = 'open' | 'pending' | 'expired' | 'draft' | 'valid';
export type AchievementLevel = 'N1' | 'N2' | 'N3' | 'N4';
