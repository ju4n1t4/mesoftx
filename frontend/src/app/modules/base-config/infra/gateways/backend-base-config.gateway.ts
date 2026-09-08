import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environment/environment';
import { BaseConfigGateway } from '../../application/ports/base-config.gateway';
import { CareerRecord, RoleRecord, StudentOutcomeRecord, UserPayload, UserRecord } from '../../domain/models/base-config.models';

@Injectable({ providedIn: 'root' })
export class BackendBaseConfigGateway extends BaseConfigGateway {
  constructor(private readonly http: HttpClient) {
    super();
  }

  roles(): Observable<RoleRecord[]> {
    return this.http.get<RoleRecord[]>(`${environment.userMsApiUrl}/roles`);
  }

  careers(): Observable<CareerRecord[]> {
    return this.http.get<CareerRecord[]>(`${environment.userMsApiUrl}/careers`);
  }

  users(): Observable<UserRecord[]> {
    return this.http.get<UserRecord[]>(`${environment.userMsApiUrl}/users`);
  }

  createUser(payload: UserPayload): Observable<UserRecord> {
    return this.http.post<UserRecord>(`${environment.userMsApiUrl}/users`, payload);
  }

  updateUser(id: number, payload: Partial<UserPayload>): Observable<UserRecord> {
    return this.http.put<UserRecord>(`${environment.userMsApiUrl}/users/${id}`, payload);
  }

  activateUser(id: number): Observable<UserRecord> {
    return this.http.patch<UserRecord>(`${environment.userMsApiUrl}/users/${id}/activate`, {});
  }

  deactivateUser(id: number): Observable<UserRecord> {
    return this.http.patch<UserRecord>(`${environment.userMsApiUrl}/users/${id}/deactivate`, {});
  }

  studentOutcomes(): Observable<StudentOutcomeRecord[]> {
    return this.http.get<StudentOutcomeRecord[]>(`${environment.assesmentMsApiUrl}/student-outcomes`);
  }

  createStudentOutcome(payload: Omit<StudentOutcomeRecord, 'id'>): Observable<StudentOutcomeRecord> {
    return this.http.post<StudentOutcomeRecord>(`${environment.assesmentMsApiUrl}/student-outcomes`, payload);
  }

  updateStudentOutcome(id: number, payload: Partial<Omit<StudentOutcomeRecord, 'id'>>): Observable<StudentOutcomeRecord> {
    return this.http.put<StudentOutcomeRecord>(`${environment.assesmentMsApiUrl}/student-outcomes/${id}`, payload);
  }
}
