import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { EntityRecord } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class UserMsService {
  constructor(private readonly http: HttpClient) {}

  list(endpoint: string): Observable<EntityRecord[]> {
    return this.http.get<EntityRecord[]>(`${environment.userMsApiUrl}/${endpoint}`);
  }

  create(endpoint: string, payload: EntityRecord): Observable<EntityRecord> {
    return this.http.post<EntityRecord>(`${environment.userMsApiUrl}/${endpoint}`, payload);
  }

  update(endpoint: string, id: number, payload: EntityRecord): Observable<EntityRecord> {
    return this.http.put<EntityRecord>(`${environment.userMsApiUrl}/${endpoint}/${id}`, payload);
  }

  activateUser(id: number): Observable<EntityRecord> {
    return this.http.patch<EntityRecord>(`${environment.userMsApiUrl}/users/${id}/activate`, {});
  }

  deactivateUser(id: number): Observable<EntityRecord> {
    return this.http.patch<EntityRecord>(`${environment.userMsApiUrl}/users/${id}/deactivate`, {});
  }
}
