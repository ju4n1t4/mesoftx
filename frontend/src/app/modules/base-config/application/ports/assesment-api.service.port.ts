import { Observable } from 'rxjs';
import {
  StudentOutcome, Performance, Level, Rubric, SoSchedule, ScheduleStatus, MyAssessment, IndicatorsChart,
  DashboardProgramResponse, DashboardSoResponse, DashboardTeacherResponse, PeriodTarget, PublicIndicators,
} from '../../domain/models/abet.models';

export abstract class AssesmentGateway {
  abstract getPublicIndicators(): Observable<PublicIndicators>;
  abstract getStudentOutcomes(): Observable<StudentOutcome[]>;
  abstract createStudentOutcome(so: { id: string; description: string; college_id: string }): Observable<StudentOutcome>;
  abstract updateStudentOutcome(id: string, so: Partial<{ description: string; college_id: string }>): Observable<StudentOutcome>;
  abstract deleteStudentOutcome(id: string): Observable<void>;
  abstract getPerformances(soId: string): Observable<Performance[]>;
  abstract createPerformance(body: { id: string; description: string; so_id: string }): Observable<Performance>;
  abstract updatePerformance(id: string, body: { description: string }): Observable<Performance>;
  abstract deletePerformance(id: string): Observable<void>;
  abstract getLevels(performanceId: string): Observable<Level[]>;
  abstract createLevel(body: { id: string; description: string; rank: number; performance_id: string }): Observable<Level>;
  abstract updateLevel(id: string, body: { description: string }): Observable<Level>;
  abstract deleteLevel(id: string): Observable<void>;
  abstract getSoSchedules(periodId?: number): Observable<SoSchedule[]>;
  abstract createSoSchedule(body: { so_id: string; period_id: number }): Observable<SoSchedule>;
  abstract deleteSoSchedule(id: number): Observable<void>;
  abstract setScheduleSubjects(id: number, nrcs: number[]): Observable<void>;
  abstract getScheduleSubjects(id: number): Observable<number[]>;
  abstract patchScheduleStatus(id: number, status: ScheduleStatus): Observable<SoSchedule>;
  abstract getPeriodTarget(periodId: number): Observable<PeriodTarget>;
  abstract updatePeriodTarget(periodId: number, targetPct: number): Observable<PeriodTarget>;
  abstract getMyAssessments(): Observable<MyAssessment[]>;
  abstract createRubric(body: {
    schedule_id: number; student_id: number; subjects_id: number;
    performance_id: string; level_id: string; evidence_id?: number | null;
  }): Observable<Rubric>;
  abstract getRubrics(params?: { period_id?: number; schedule_id?: number; subjects_id?: number }): Observable<Rubric[]>;
  abstract getIndicatorsChart(periodId: number): Observable<IndicatorsChart>;
  abstract getDashboardProgram(periodId: number): Observable<DashboardProgramResponse>;
  abstract getDashboardSo(periodId: number): Observable<DashboardSoResponse>;
  abstract getDashboardTeacher(periodId: number): Observable<DashboardTeacherResponse>;
}
