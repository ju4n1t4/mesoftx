import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { EntityRecord } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class AssesmentMsService {
  constructor(private readonly http: HttpClient) {}

  list(endpoint: string): Observable<EntityRecord[]> {
    return this.http.get<EntityRecord[]>(`${environment.assesmentMsApiUrl}/${endpoint}`);
  }

  create(endpoint: string, payload: EntityRecord): Observable<EntityRecord> {
    return this.http.post<EntityRecord>(`${environment.assesmentMsApiUrl}/${endpoint}`, payload);
  }

  update(endpoint: string, id: number, payload: EntityRecord): Observable<EntityRecord> {
    return this.http.put<EntityRecord>(`${environment.assesmentMsApiUrl}/${endpoint}/${id}`, payload);
  }
}
