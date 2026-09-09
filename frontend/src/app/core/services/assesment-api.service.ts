/**
 * AssesmentApiService — consume el microservicio Assesment_MS (:8002/api/v1).
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  StudentOutcome, PerformanceIndicator, PerformanceIndicatorDetail,
  PerformanceEvaluation, PerformanceEvaluationDetail,
  AssesmentEvidence, AssesmentResult,
} from '../models/abet.models';

@Injectable({ providedIn: 'root' })
export class AssesmentApiService {
  private base = environment.assesmentApiUrl;
  constructor(private http: HttpClient) {}

  // ── Student Outcomes ──────────────────────────────────────
  getStudentOutcomes(): Observable<StudentOutcome[]> {
    return this.http.get<StudentOutcome[]>(`${this.base}/student-outcomes`);
  }
  createStudentOutcome(so: { code: string; description?: string }): Observable<StudentOutcome> {
    return this.http.post<StudentOutcome>(`${this.base}/student-outcomes`, so);
  }
  updateStudentOutcome(id: number, so: Partial<{ code: string; description: string }>): Observable<StudentOutcome> {
    return this.http.put<StudentOutcome>(`${this.base}/student-outcomes/${id}`, so);
  }

  // ── Performance Indicators ────────────────────────────────
  getPerformanceIndicators(): Observable<PerformanceIndicator[]> {
    return this.http.get<PerformanceIndicator[]>(`${this.base}/performance-indicators`);
  }
  createPerformanceIndicator(pi: { code: string; name?: string }): Observable<PerformanceIndicator> {
    return this.http.post<PerformanceIndicator>(`${this.base}/performance-indicators`, pi);
  }

  // ── Performance Indicator Details ─────────────────────────
  getPerformanceIndicatorDetails(): Observable<PerformanceIndicatorDetail[]> {
    return this.http.get<PerformanceIndicatorDetail[]>(`${this.base}/performance-indicator-details`);
  }
  createPerformanceIndicatorDetail(d: Omit<PerformanceIndicatorDetail, 'id'>): Observable<PerformanceIndicatorDetail> {
    return this.http.post<PerformanceIndicatorDetail>(`${this.base}/performance-indicator-details`, d);
  }
  updatePerformanceIndicatorDetail(id: number, d: Partial<Omit<PerformanceIndicatorDetail, 'id'>>): Observable<PerformanceIndicatorDetail> {
    return this.http.put<PerformanceIndicatorDetail>(`${this.base}/performance-indicator-details/${id}`, d);
  }

  // ── Performance Evaluations (niveles N1–N4) ───────────────
  getPerformanceEvaluations(): Observable<PerformanceEvaluation[]> {
    return this.http.get<PerformanceEvaluation[]>(`${this.base}/performance-evaluations`);
  }
  createPerformanceEvaluation(pe: { evaluation_value: string }): Observable<PerformanceEvaluation> {
    return this.http.post<PerformanceEvaluation>(`${this.base}/performance-evaluations`, pe);
  }

  // ── Performance Evaluation Details ────────────────────────
  getPerformanceEvaluationDetails(): Observable<PerformanceEvaluationDetail[]> {
    return this.http.get<PerformanceEvaluationDetail[]>(`${this.base}/performance-evaluation-details`);
  }
  createPerformanceEvaluationDetail(d: Omit<PerformanceEvaluationDetail, 'id'>): Observable<PerformanceEvaluationDetail> {
    return this.http.post<PerformanceEvaluationDetail>(`${this.base}/performance-evaluation-details`, d);
  }

  // ── Assesment Evidence ────────────────────────────────────
  getAssesmentEvidence(): Observable<AssesmentEvidence[]> {
    return this.http.get<AssesmentEvidence[]>(`${this.base}/assesment-evidence`);
  }
  createAssesmentEvidence(e: Omit<AssesmentEvidence, 'id' | 'created_at'>): Observable<AssesmentEvidence> {
    return this.http.post<AssesmentEvidence>(`${this.base}/assesment-evidence`, e);
  }
  createEvidenceWithResults(payload: {
    evidence_name_doc: string;
    student_code: string;
    student_outcome_id: number;
    results: { subject_code: string; student_outcome_id: number; performance_evaluation_detail_id: number }[];
  }): Observable<{ evidence: AssesmentEvidence; results: AssesmentResult[] }> {
    return this.http.post<{ evidence: AssesmentEvidence; results: AssesmentResult[] }>(
      `${this.base}/assesment-evidence/with-results`, payload,
    );
  }

  // ── Assesment Results ─────────────────────────────────────
  getAssesmentResults(): Observable<AssesmentResult[]> {
    return this.http.get<AssesmentResult[]>(`${this.base}/assesment-results`);
  }
}
