import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { IntegrationsGateway } from '../../application/ports/integrations.gateway';
import { IntegrationConnection, IntegrationDraft, IntegrationRun, IntegrationRecord } from '../../domain/models/integrations.models';

@Injectable({ providedIn: 'root' })
export class HttpIntegrationsGateway extends IntegrationsGateway {
  private readonly base = `${environment.userApiUrl}/integrations`;
  constructor(private http: HttpClient) { super(); }
  list() { return this.http.get<IntegrationConnection[]>(this.base); }
  create(draft: IntegrationDraft) { return this.http.post<IntegrationConnection>(this.base, draft); }
  update(id: number, draft: Partial<IntegrationDraft>) { return this.http.patch<IntegrationConnection>(`${this.base}/${id}`, draft); }
  probe(id: number) { return this.http.post<{ reachable: boolean }>(`${this.base}/${id}/probe`, {}); }
  sync(id: number, key: string) { return this.http.post<IntegrationRun>(`${this.base}/${id}/sync`, {}, { headers: { 'Idempotency-Key': key } }); }
  runs(id: number) { return this.http.get<IntegrationRun[]>(`${this.base}/${id}/runs`); }
  records(id: number, offset = 0) { return this.http.get<IntegrationRecord[]>(`${this.base}/${id}/records`, { params: { offset, limit: 100 } }); }
}
