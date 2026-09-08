import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface StudentOutcomeRecord {
  id: number;
  code: string;
  description?: string | null;
}

export interface PerformanceIndicatorRecord {
  id: number;
  code: string;
  name?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AssesmentMsService {
  constructor(private readonly http: HttpClient) {}

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
}
