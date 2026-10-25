import { Observable } from 'rxjs';
import {
  User, UserCreate, Role, Permission, Program, Subject, College, Period,
  TeacherSubject, TeacherSubjectDetail, Student, StudentUploadRow, StudentUploadResult,
} from '../../domain/models/abet.models';

export abstract class UserGateway {
  abstract getUsers(): Observable<User[]>;
  abstract getUser(id: number): Observable<User>;
  abstract createUser(u: UserCreate): Observable<User>;
  abstract updateUser(id: number, u: Partial<UserCreate>): Observable<User>;
  abstract activateUser(id: number): Observable<User>;
  abstract deactivateUser(id: number): Observable<User>;
  abstract getRoles(): Observable<Role[]>;
  abstract createRole(body: { name: string; description?: string }): Observable<Role>;
  abstract updateRole(id: number, body: { name?: string; description?: string }): Observable<Role>;
  abstract deleteRole(id: number): Observable<void>;
  abstract setRolePermissions(id: number, codes: string[]): Observable<Role>;
  abstract getRolePermissions(id: number): Observable<string[]>;
  abstract changeMyPassword(current_password: string, new_password: string): Observable<void>;
  abstract getPermissions(): Observable<Permission[]>;
  abstract getPrograms(): Observable<Program[]>;
  abstract getProgram(id: string): Observable<Program>;
  abstract createProgram(p: Program): Observable<Program>;
  abstract updateProgram(id: string, p: Partial<Program>): Observable<Program>;
  abstract deleteProgram(id: string): Observable<void>;
  abstract getSubjects(): Observable<Subject[]>;
  abstract getSubject(nrc: number): Observable<Subject>;
  abstract createSubject(body: Subject): Observable<Subject>;
  abstract updateSubject(nrc: number, body: Partial<Subject>): Observable<Subject>;
  abstract deleteSubject(nrc: number): Observable<void>;
  abstract assignTeacherSubject(body: { user_id: number; subjects_id: number }): Observable<TeacherSubject>;
  abstract getTeacherSubjects(userId: number): Observable<TeacherSubjectDetail[]>;
  abstract deleteTeacherSubject(id: number): Observable<void>;
  abstract getMySubjects(): Observable<Subject[]>;
  abstract getMyPendingSubjects(): Observable<Subject[]>;
  abstract uploadStudents(nrc: number, rows: StudentUploadRow[]): Observable<StudentUploadResult>;
  abstract getSubjectStudents(nrc: number): Observable<Student[]>;
  abstract getColleges(): Observable<College[]>;
  abstract getCollege(id: string): Observable<College>;
  abstract createCollege(c: College): Observable<College>;
  abstract updateCollege(id: string, c: Partial<College>): Observable<College>;
  abstract deleteCollege(id: string): Observable<void>;
  abstract getPeriods(): Observable<Period[]>;
  abstract getPeriod(id: number): Observable<Period>;
  abstract createPeriod(p: { code: string; active?: boolean }): Observable<Period>;
  abstract updatePeriod(id: number, p: { code?: string; active?: boolean }): Observable<Period>;
  abstract deletePeriod(id: number): Observable<void>;
}
