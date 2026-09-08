import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environment/environment';
import { BaseConfigGateway } from '../../application/ports/base-config.gateway';
import {
  CareerPayload,
  CareerRecord,
  PerformanceEvaluationDetailRecord,
  PerformanceEvaluationRecord,
  PerformanceIndicatorDetailRecord,
  PerformanceIndicatorRecord,
  RoleRecord,
  StudentOutcomeRecord,
  UserPayload,
  UserRecord
} from '../../domain/models/base-config.models';

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

  createCareer(payload: CareerPayload): Observable<CareerRecord> {
    return this.http.post<CareerRecord>(`${environment.userMsApiUrl}/careers`, payload);
  }

  updateCareer(id: number, payload: Partial<CareerPayload>): Observable<CareerRecord> {
    return this.http.put<CareerRecord>(`${environment.userMsApiUrl}/careers/${id}`, payload);
  }

  deleteCareer(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.userMsApiUrl}/careers/${id}`);
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

  performanceIndicators(): Observable<PerformanceIndicatorRecord[]> {
    return this.http.get<PerformanceIndicatorRecord[]>(`${environment.assesmentMsApiUrl}/performance-indicators`);
  }

  createPerformanceIndicator(payload: Omit<PerformanceIndicatorRecord, 'id'>): Observable<PerformanceIndicatorRecord> {
    return this.http.post<PerformanceIndicatorRecord>(`${environment.assesmentMsApiUrl}/performance-indicators`, payload);
  }

  updatePerformanceIndicator(id: number, payload: Partial<Omit<PerformanceIndicatorRecord, 'id'>>): Observable<PerformanceIndicatorRecord> {
    return this.http.put<PerformanceIndicatorRecord>(`${environment.assesmentMsApiUrl}/performance-indicators/${id}`, payload);
  }

  deletePerformanceIndicator(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.assesmentMsApiUrl}/performance-indicators/${id}`);
  }

  performanceIndicatorDetails(): Observable<PerformanceIndicatorDetailRecord[]> {
    return this.http.get<PerformanceIndicatorDetailRecord[]>(`${environment.assesmentMsApiUrl}/performance-indicator-details`);
  }

  createPerformanceIndicatorDetail(payload: Omit<PerformanceIndicatorDetailRecord, 'id'>): Observable<PerformanceIndicatorDetailRecord> {
    return this.http.post<PerformanceIndicatorDetailRecord>(`${environment.assesmentMsApiUrl}/performance-indicator-details`, payload);
  }

  updatePerformanceIndicatorDetail(id: number, payload: Partial<Omit<PerformanceIndicatorDetailRecord, 'id'>>): Observable<PerformanceIndicatorDetailRecord> {
    return this.http.put<PerformanceIndicatorDetailRecord>(`${environment.assesmentMsApiUrl}/performance-indicator-details/${id}`, payload);
  }

  performanceEvaluations(): Observable<PerformanceEvaluationRecord[]> {
    return this.http.get<PerformanceEvaluationRecord[]>(`${environment.assesmentMsApiUrl}/performance-evaluations`);
  }

  performanceEvaluationDetails(): Observable<PerformanceEvaluationDetailRecord[]> {
    return this.http.get<PerformanceEvaluationDetailRecord[]>(`${environment.assesmentMsApiUrl}/performance-evaluation-details`);
  }

  createPerformanceEvaluationDetail(payload: Omit<PerformanceEvaluationDetailRecord, 'id'>): Observable<PerformanceEvaluationDetailRecord> {
    return this.http.post<PerformanceEvaluationDetailRecord>(`${environment.assesmentMsApiUrl}/performance-evaluation-details`, payload);
  }

  updatePerformanceEvaluationDetail(id: number, payload: Partial<Omit<PerformanceEvaluationDetailRecord, 'id'>>): Observable<PerformanceEvaluationDetailRecord> {
    return this.http.put<PerformanceEvaluationDetailRecord>(`${environment.assesmentMsApiUrl}/performance-evaluation-details/${id}`, payload);
  }
}
