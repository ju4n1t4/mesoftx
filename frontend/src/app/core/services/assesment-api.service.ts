/**
 * AssesmentApiService — consume el microservicio Assesment_MS (:8002/api/v1).
 * Modelo v13 (paso 16) + métodos de F1 (programación, rúbrica, mis valoraciones).
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  StudentOutcome, Performance, Level, Rubric, SoSchedule, ScheduleStatus, MyAssessment, IndicatorsChart,
  DashboardProgramResponse, DashboardSoResponse, DashboardTeacherResponse, PeriodTarget,
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
  deleteStudentOutcome(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/so/${id}`);
  }

  // ── Indicadores y niveles ─────────────────────────────────
  getPerformances(soId: string): Observable<Performance[]> {
    return this.http.get<Performance[]>(`${this.base}/performance`, { params: { so_id: soId } });
  }
  createPerformance(body: { id: string; description: string; so_id: string }): Observable<Performance> {
    return this.http.post<Performance>(`${this.base}/performance`, body);
  }
  updatePerformance(id: string, body: { description: string }): Observable<Performance> {
    return this.http.put<Performance>(`${this.base}/performance/${id}`, body);
  }
  deletePerformance(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/performance/${id}`);
  }
  getLevels(performanceId: string): Observable<Level[]> {
    return this.http.get<Level[]>(`${this.base}/performance/${performanceId}/levels`);
  }
  createLevel(body: { id: string; description: string; rank: number; performance_id: string }): Observable<Level> {
    return this.http.post<Level>(`${this.base}/level`, body);
  }
  updateLevel(id: string, body: { description: string }): Observable<Level> {
    return this.http.put<Level>(`${this.base}/level/${id}`, body);
  }
  deleteLevel(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/level/${id}`);
  }

  // ── Programación de Student Outcomes ──────────────────────
  getSoSchedules(periodId?: number): Observable<SoSchedule[]> {
    let params = new HttpParams();
    if (periodId != null) params = params.set('period_id', String(periodId));
    return this.http.get<SoSchedule[]>(`${this.base}/so-schedule`, { params });
  }
  createSoSchedule(body: { so_id: string; period_id: number }): Observable<SoSchedule> {
    return this.http.post<SoSchedule>(`${this.base}/so-schedule`, body);
  }
  deleteSoSchedule(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/so-schedule/${id}`);
  }
  setScheduleSubjects(id: number, nrcs: number[]): Observable<void> {
    return this.http.put<void>(`${this.base}/so-schedule/${id}/subjects`, { nrcs });
  }
  getScheduleSubjects(id: number): Observable<number[]> {
    return this.http.get<number[]>(`${this.base}/so-schedule/${id}/subjects`);
  }
  patchScheduleStatus(id: number, status: ScheduleStatus): Observable<SoSchedule> {
    return this.http.patch<SoSchedule>(`${this.base}/so-schedule/${id}/status`, { status });
  }

  // ── Meta de logro del periodo ─────────────────────────────
  getPeriodTarget(periodId: number): Observable<PeriodTarget> {
    return this.http.get<PeriodTarget>(`${this.base}/period-target/${periodId}`);
  }
  updatePeriodTarget(periodId: number, targetPct: number): Observable<PeriodTarget> {
    return this.http.put<PeriodTarget>(`${this.base}/period-target/${periodId}`, { target_pct: targetPct });
  }

  // ── Profesor: qué debo valorar ────────────────────────────
  getMyAssessments(): Observable<MyAssessment[]> {
    return this.http.get<MyAssessment[]>(`${this.base}/me/assessments`);
  }

  // ── Rúbricas (valoraciones) ───────────────────────────────
  createRubric(body: {
    schedule_id: number; student_id: number; subjects_id: number;
    performance_id: string; level_id: string; evidence_id?: number | null;
  }): Observable<Rubric> {
    return this.http.post<Rubric>(`${this.base}/rubric`, body);
  }
  getRubrics(params?: { period_id?: number; schedule_id?: number; subjects_id?: number }): Observable<Rubric[]> {
    let httpParams = new HttpParams();
    if (params?.period_id != null) httpParams = httpParams.set('period_id', String(params.period_id));
    if (params?.schedule_id != null) httpParams = httpParams.set('schedule_id', String(params.schedule_id));
    if (params?.subjects_id != null) httpParams = httpParams.set('subjects_id', String(params.subjects_id));
    return this.http.get<Rubric[]>(`${this.base}/rubric`, { params: httpParams });
  }

  // ── Gráfica de indicadores (dashboards / auditor) ─────────
  getIndicatorsChart(periodId: number): Observable<IndicatorsChart> {
    return this.http.get<IndicatorsChart>(`${this.base}/indicators/chart`, { params: { period_id: String(periodId) } });
  }

  // ── Dashboards de avance (F2) ─────────────────────────────
  getDashboardProgram(periodId: number): Observable<DashboardProgramResponse> {
    return this.http.get<DashboardProgramResponse>(`${this.base}/dashboard/program`, { params: { period_id: String(periodId) } });
  }
  getDashboardSo(periodId: number): Observable<DashboardSoResponse> {
    return this.http.get<DashboardSoResponse>(`${this.base}/dashboard/so`, { params: { period_id: String(periodId) } });
  }
  getDashboardTeacher(periodId: number): Observable<DashboardTeacherResponse> {
    return this.http.get<DashboardTeacherResponse>(`${this.base}/dashboard/teacher`, { params: { period_id: String(periodId) } });
  }
}
