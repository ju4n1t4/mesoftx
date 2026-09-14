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
  studentId: number;
  subjectsId: number;
  performance_id: string;
  level_id: string;
  evidence_id?: number | null;
  created_at?: string;
}

export interface Evidence {
  id: number;
  schedule_id: number;
  subjectsId: number;
  studentId: number;
  name: string;
  file_url: string;
  mime_type?: string | null;
  uploaded_by: number;
  created_at?: string;
}

// ── UI helpers ────────────────────────────────────────────────────────────
export type AssesmentStatus = 'open' | 'pending' | 'expired' | 'draft' | 'valid';
export type AchievementLevel = 'N1' | 'N2' | 'N3' | 'N4';
