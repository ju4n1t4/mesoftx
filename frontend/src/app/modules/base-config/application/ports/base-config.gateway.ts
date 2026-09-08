import { Observable } from 'rxjs';

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

export abstract class BaseConfigGateway {
  abstract roles(): Observable<RoleRecord[]>;
  abstract careers(): Observable<CareerRecord[]>;
  abstract createCareer(payload: CareerPayload): Observable<CareerRecord>;
  abstract updateCareer(id: number, payload: Partial<CareerPayload>): Observable<CareerRecord>;
  abstract deleteCareer(id: number): Observable<void>;
  abstract users(): Observable<UserRecord[]>;
  abstract createUser(payload: UserPayload): Observable<UserRecord>;
  abstract updateUser(id: number, payload: Partial<UserPayload>): Observable<UserRecord>;
  abstract activateUser(id: number): Observable<UserRecord>;
  abstract deactivateUser(id: number): Observable<UserRecord>;
  abstract studentOutcomes(): Observable<StudentOutcomeRecord[]>;
  abstract createStudentOutcome(payload: Omit<StudentOutcomeRecord, 'id'>): Observable<StudentOutcomeRecord>;
  abstract updateStudentOutcome(id: number, payload: Partial<Omit<StudentOutcomeRecord, 'id'>>): Observable<StudentOutcomeRecord>;
  abstract performanceIndicators(): Observable<PerformanceIndicatorRecord[]>;
  abstract createPerformanceIndicator(payload: Omit<PerformanceIndicatorRecord, 'id'>): Observable<PerformanceIndicatorRecord>;
  abstract updatePerformanceIndicator(id: number, payload: Partial<Omit<PerformanceIndicatorRecord, 'id'>>): Observable<PerformanceIndicatorRecord>;
  abstract deletePerformanceIndicator(id: number): Observable<void>;
  abstract performanceIndicatorDetails(): Observable<PerformanceIndicatorDetailRecord[]>;
  abstract createPerformanceIndicatorDetail(payload: Omit<PerformanceIndicatorDetailRecord, 'id'>): Observable<PerformanceIndicatorDetailRecord>;
  abstract updatePerformanceIndicatorDetail(id: number, payload: Partial<Omit<PerformanceIndicatorDetailRecord, 'id'>>): Observable<PerformanceIndicatorDetailRecord>;
  abstract performanceEvaluations(): Observable<PerformanceEvaluationRecord[]>;
  abstract performanceEvaluationDetails(): Observable<PerformanceEvaluationDetailRecord[]>;
  abstract createPerformanceEvaluationDetail(payload: Omit<PerformanceEvaluationDetailRecord, 'id'>): Observable<PerformanceEvaluationDetailRecord>;
  abstract updatePerformanceEvaluationDetail(id: number, payload: Partial<Omit<PerformanceEvaluationDetailRecord, 'id'>>): Observable<PerformanceEvaluationDetailRecord>;
}
