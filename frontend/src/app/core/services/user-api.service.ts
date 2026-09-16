/**
 * UserApiService — consume el microservicio User_MS (:8001/api/v1).
 * Todos los endpoints (salvo /auth/login) requieren JWT; el interceptor lo añade.
 * Renombrado al modelo v13 (paso 16): careers→/programs, faculty→/colleges.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  User, UserCreate, Role, Permission, Program, Subject, College, Period,
  TeacherSubject, TeacherSubjectDetail, Student, StudentUploadRow, StudentUploadResult,
} from '../models/abet.models';

@Injectable({ providedIn: 'root' })
export class UserApiService {
  private base = environment.userApiUrl;
  constructor(private http: HttpClient) {}

  // ── Usuarios ──────────────────────────────────────────────
  getUsers(): Observable<User[]>              { return this.http.get<User[]>(`${this.base}/users`); }
  getUser(id: number): Observable<User>       { return this.http.get<User>(`${this.base}/users/${id}`); }
  createUser(u: UserCreate): Observable<User> { return this.http.post<User>(`${this.base}/users`, u); }
  updateUser(id: number, u: Partial<UserCreate>): Observable<User> {
    return this.http.put<User>(`${this.base}/users/${id}`, u);
  }
  activateUser(id: number): Observable<User>   { return this.http.patch<User>(`${this.base}/users/${id}/activate`, {}); }
  deactivateUser(id: number): Observable<User> { return this.http.patch<User>(`${this.base}/users/${id}/deactivate`, {}); }

  // ── Roles ─────────────────────────────────────────────────
  getRoles(): Observable<Role[]> { return this.http.get<Role[]>(`${this.base}/roles`); }
  createRole(body: { name: string; description?: string }): Observable<Role> { return this.http.post<Role>(`${this.base}/roles`, body); }
  updateRole(id: number, body: { name?: string; description?: string }): Observable<Role> { return this.http.put<Role>(`${this.base}/roles/${id}`, body); }
  deleteRole(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/roles/${id}`); }
  setRolePermissions(id: number, codes: string[]): Observable<Role> {
    return this.http.put<Role>(`${this.base}/roles/${id}/permissions`, { permission_codes: codes });
  }
  getRolePermissions(id: number): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/roles/${id}/permissions`);
  }

  // ── Permisos ──────────────────────────────────────────────
  getPermissions(): Observable<Permission[]> { return this.http.get<Permission[]>(`${this.base}/permissions`); }

  // ── Público (temporal, para la defensa): perfiles existentes, sin token ──
  getPublicRoles(): Observable<Pick<Role, 'id' | 'name'>[]> {
    return this.http.get<Pick<Role, 'id' | 'name'>[]>(`${this.base}/public/roles`);
  }

  // ── Programas (antes carreras) ────────────────────────────
  getPrograms(): Observable<Program[]>          { return this.http.get<Program[]>(`${this.base}/programs`); }
  getProgram(id: string): Observable<Program>   { return this.http.get<Program>(`${this.base}/programs/${id}`); }
  createProgram(p: Program): Observable<Program> { return this.http.post<Program>(`${this.base}/programs`, p); }
  updateProgram(id: string, p: Partial<Program>): Observable<Program> { return this.http.put<Program>(`${this.base}/programs/${id}`, p); }
  deleteProgram(id: string): Observable<void> { return this.http.delete<void>(`${this.base}/programs/${id}`); }

  // ── Materias (NRC) ────────────────────────────────────────
  getSubjects(): Observable<Subject[]> { return this.http.get<Subject[]>(`${this.base}/subjects`); }
  getSubject(nrc: number): Observable<Subject> { return this.http.get<Subject>(`${this.base}/subjects/${nrc}`); }
  createSubject(body: Subject): Observable<Subject> { return this.http.post<Subject>(`${this.base}/subjects`, body); }
  updateSubject(nrc: number, body: Partial<Subject>): Observable<Subject> { return this.http.put<Subject>(`${this.base}/subjects/${nrc}`, body); }
  deleteSubject(nrc: number): Observable<void> { return this.http.delete<void>(`${this.base}/subjects/${nrc}`); }

  // ── Asignación profesor-materia ───────────────────────────
  assignTeacherSubject(body: { user_id: number; subjects_id: number }): Observable<TeacherSubject> {
    return this.http.post<TeacherSubject>(`${this.base}/teacher-subjects`, body);
  }
  getTeacherSubjects(userId: number): Observable<TeacherSubjectDetail[]> {
    return this.http.get<TeacherSubjectDetail[]>(`${this.base}/teacher-subjects`, { params: { user_id: String(userId) } });
  }
  deleteTeacherSubject(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/teacher-subjects/${id}`); }

  // ── Profesor: mis cursos ──────────────────────────────────
  getMySubjects(): Observable<Subject[]> { return this.http.get<Subject[]>(`${this.base}/me/subjects`); }
  getMyPendingSubjects(): Observable<Subject[]> { return this.http.get<Subject[]>(`${this.base}/me/subjects/pending`); }

  // ── Estudiantes ───────────────────────────────────────────
  uploadStudents(nrc: number, rows: StudentUploadRow[]): Observable<StudentUploadResult> {
    return this.http.post<StudentUploadResult>(`${this.base}/subjects/${nrc}/students`, { students: rows });
  }
  getSubjectStudents(nrc: number): Observable<Student[]> { return this.http.get<Student[]>(`${this.base}/subjects/${nrc}/students`); }

  // ── Facultades (antes faculty) ────────────────────────────
  getColleges(): Observable<College[]> { return this.http.get<College[]>(`${this.base}/colleges`); }
  getCollege(id: string): Observable<College> { return this.http.get<College>(`${this.base}/colleges/${id}`); }
  createCollege(c: College): Observable<College> { return this.http.post<College>(`${this.base}/colleges`, c); }
  updateCollege(id: string, c: Partial<College>): Observable<College> { return this.http.put<College>(`${this.base}/colleges/${id}`, c); }
  deleteCollege(id: string): Observable<void> { return this.http.delete<void>(`${this.base}/colleges/${id}`); }

  // ── Periodos ──────────────────────────────────────────────
  getPeriods(): Observable<Period[]> { return this.http.get<Period[]>(`${this.base}/periods`); }
  getPeriod(id: number): Observable<Period> { return this.http.get<Period>(`${this.base}/periods/${id}`); }
  createPeriod(p: { code: string; active?: boolean }): Observable<Period> { return this.http.post<Period>(`${this.base}/periods`, p); }
  updatePeriod(id: number, p: { code?: string; active?: boolean }): Observable<Period> { return this.http.put<Period>(`${this.base}/periods/${id}`, p); }
  deletePeriod(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/periods/${id}`); }
}
