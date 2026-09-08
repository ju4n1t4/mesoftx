export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserResponse {
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

export interface HealthResponse {
  status: string;
  service: string;
}
