export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface ApiError {
  detail: string;
}

export type EntityRecord = Record<string, string | number | boolean | null | undefined | Array<number>>;

export interface ResourceField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'password' | 'textarea';
  required?: boolean;
}

export interface ResourceConfig {
  key: string;
  title: string;
  endpoint: string;
  fields: ResourceField[];
}
