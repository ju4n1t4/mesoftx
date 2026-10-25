import { Observable } from 'rxjs';
import { IntegrationConnection, IntegrationDraft, IntegrationRun, IntegrationRecord } from '../../domain/models/integrations.models';

export abstract class IntegrationsGateway {
  abstract list(): Observable<IntegrationConnection[]>;
  abstract create(draft: IntegrationDraft): Observable<IntegrationConnection>;
  abstract update(id: number, draft: Partial<IntegrationDraft>): Observable<IntegrationConnection>;
  abstract probe(id: number): Observable<{ reachable: boolean }>;
  abstract sync(id: number, key: string): Observable<IntegrationRun>;
  abstract runs(id: number): Observable<IntegrationRun[]>;
  abstract records(id: number, offset?: number): Observable<IntegrationRecord[]>;
}
