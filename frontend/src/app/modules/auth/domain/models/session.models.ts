// ── Auth ──────────────────────────────────────────────────────────────────
export interface LoginRequest  { email: string; password: string; }
export interface TokenResponse { access_token: string; token_type: string; }
export interface AuthMode { demo_enabled: boolean; demo_roles: string[]; }

export interface CurrentUser {
  id: number;
  name: string;
  email: string;
  document_number: string;
  role_id: number;
  role: string | null;
  permissions: string[];
  program_id: string | null;
  active: boolean;
}

