export interface IntegrationConnection {
  id: number; name: string; base_url: string; resource_path: string; records_path: string;
  external_id_field: string; auth_type: 'none' | 'bearer' | 'api_key'; enabled: boolean;
  credential_configured: boolean; created_at: string; updated_at: string;
}
export type IntegrationDraft = Pick<IntegrationConnection, 'name'|'base_url'|'resource_path'|'records_path'|'external_id_field'|'auth_type'|'enabled'> & { secret?: string };
export interface IntegrationRun { id: number; connection_id: number; status: string; records_count: number; error_code: string|null; started_at: string; finished_at: string|null; }
export interface IntegrationRecord { external_id: string; payload: Record<string, unknown>; updated_at: string; }
