import { Observable } from 'rxjs';

import { CareerRecord, RoleRecord, StudentOutcomeRecord, UserPayload, UserRecord } from '../../domain/models/base-config.models';

export abstract class BaseConfigGateway {
  abstract roles(): Observable<RoleRecord[]>;
  abstract careers(): Observable<CareerRecord[]>;
  abstract users(): Observable<UserRecord[]>;
  abstract createUser(payload: UserPayload): Observable<UserRecord>;
  abstract updateUser(id: number, payload: Partial<UserPayload>): Observable<UserRecord>;
  abstract activateUser(id: number): Observable<UserRecord>;
  abstract deactivateUser(id: number): Observable<UserRecord>;
  abstract studentOutcomes(): Observable<StudentOutcomeRecord[]>;
  abstract createStudentOutcome(payload: Omit<StudentOutcomeRecord, 'id'>): Observable<StudentOutcomeRecord>;
  abstract updateStudentOutcome(id: number, payload: Partial<Omit<StudentOutcomeRecord, 'id'>>): Observable<StudentOutcomeRecord>;
}
