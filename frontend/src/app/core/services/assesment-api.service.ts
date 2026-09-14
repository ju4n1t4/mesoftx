/**
 * AssesmentApiService — consume el microservicio Assesment_MS (:8002/api/v1).
 * Renombrado al modelo v13 (paso 16): student-outcomes→/so, performance-indicators→
 * /performance, performance-evaluations→/level, assesment-results→/rubric.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  StudentOutcome, Performance, Level, Rubric,
} from '../models/abet.models';

@Injectable({ providedIn: 'root' })
export class AssesmentApiService {
  private base = environment.assesmentApiUrl;
  constructor(private http: HttpClient) {}

  // ── Student Outcomes ──────────────────────────────────────
  getStudentOutcomes(): Observable<StudentOutcome[]> {
    return this.http.get<StudentOutcome[]>(`${this.base}/so`);
  }
  createStudentOutcome(so: { id: string; description: string; college_id: string }): Observable<StudentOutcome> {
    return this.http.post<StudentOutcome>(`${this.base}/so`, so);
  }
  updateStudentOutcome(id: string, so: Partial<{ description: string; college_id: string }>): Observable<StudentOutcome> {
    return this.http.put<StudentOutcome>(`${this.base}/so/${id}`, so);
  }

  // ── Indicadores de desempeño ──────────────────────────────
  getPerformance(soId: string): Observable<Performance[]> {
    return this.http.get<Performance[]>(`${this.base}/performance`, { params: { so_id: soId } });
  }
  createPerformance(p: { id: string; description: string; so_id: string }): Observable<Performance> {
    return this.http.post<Performance>(`${this.base}/performance`, p);
  }

  // ── Niveles ───────────────────────────────────────────────
  getLevels(performanceId: string): Observable<Level[]> {
    return this.http.get<Level[]>(`${this.base}/performance/${performanceId}/levels`);
  }
  createLevel(l: Omit<Level, never>): Observable<Level> {
    return this.http.post<Level>(`${this.base}/level`, l);
  }

  // ── Rúbricas (valoraciones) ───────────────────────────────
  getRubrics(periodId?: number): Observable<Rubric[]> {
    const options = periodId != null ? { params: { period_id: String(periodId) } } : {};
    return this.http.get<Rubric[]>(`${this.base}/rubric`, options);
  }
  createRubric(r: Omit<Rubric, 'id' | 'evaluator_user_id' | 'created_at'>): Observable<Rubric> {
    return this.http.post<Rubric>(`${this.base}/rubric`, r);
  }
}
