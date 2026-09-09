// ── Auth ──────────────────────────────────────────────────────────────────
export interface LoginRequest  { email: string; password: string; }
export interface TokenResponse { access_token: string; token_type: string; }

export interface CurrentUser {
  id: number;
  name: string;
  surname: string;
  email: string;
  code: string;
  role_id: number;
  role: 'Admin' | 'Coordinador' | 'Docente' | 'Evaluador' | 'Estudiante';
  career_id: number;
  subject_ids: number[];
  active: boolean;
}

// ── User MS ───────────────────────────────────────────────────────────────
export interface Role     { id: number; name: string; description?: string; }
export interface Year     { id: number; year: number; }
export interface Period   { id: number; period: string; }
export interface AcademicPeriod { id: number; name: string; code: string; period_id: number; year_id: number; }
export interface Faculty  { id: number; name: string; code: string; description?: string; }
export interface Career   { id: number; name: string; code: string; faculty_id: number; description?: string; accredited: boolean; accreditation_end_year?: number | null; }
export interface Subject  { id: number; name: string; code: string; career_id: number; description?: string; }

export interface User {
  id: number;
  name: string;
  surname: string;
  code: string;
  email: string;
  active: boolean;
  role_id: number;
  career_id: number;
  subject_ids: number[];
  created_at?: string;
}

export interface UserCreate {
  name: string; surname: string; code: string; email: string; password: string;
  role_id: number; career_id: number; subject_ids: number[];
}

// ── Assesment MS ──────────────────────────────────────────────────────────
export interface StudentOutcome {
  id: number;
  code: string;
  description?: string;
}

export interface PerformanceIndicator {
  id: number;
  code: string;
  name?: string;
}

export interface PerformanceIndicatorDetail {
  id: number;
  performance_indicator_id: number;
  student_outcome_id: number;
  description: string;
}

export interface PerformanceEvaluation {
  id: number;
  evaluation_value: string;   // e.g. "N1", "N2", "N3", "N4"
}

export interface PerformanceEvaluationDetail {
  id: number;
  performance_evaluation_id: number;
  performance_indicator_id: number;
  student_outcome_id: number;
  description: string;
}

export interface AssesmentEvidence {
  id: number;
  evidence_name_doc: string;
  student_code: string;
  student_outcome_id: number;
  created_at?: string;
}

export interface AssesmentResult {
  id: number;
  subject_code: string;
  assesment_evidence_id: number;
  student_outcome_id: number;
  performance_evaluation_detail_id: number;
  created_at?: string;
}

// ── UI helpers ────────────────────────────────────────────────────────────
export type AssesmentStatus = 'open' | 'pending' | 'expired' | 'draft' | 'valid';
export type AchievementLevel = 'N1' | 'N2' | 'N3' | 'N4';
