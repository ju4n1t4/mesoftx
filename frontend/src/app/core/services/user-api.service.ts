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
  User, UserCreate, Role, Program, Subject, College, Period,
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

  // ── Programas (antes carreras) ────────────────────────────
  getPrograms(): Observable<Program[]>          { return this.http.get<Program[]>(`${this.base}/programs`); }
  getProgram(id: string): Observable<Program>   { return this.http.get<Program>(`${this.base}/programs/${id}`); }

  // ── Asignaturas ───────────────────────────────────────────
  getSubjects(): Observable<Subject[]> { return this.http.get<Subject[]>(`${this.base}/subjects`); }

  // ── Facultades (antes faculty) ────────────────────────────
  getColleges(): Observable<College[]> { return this.http.get<College[]>(`${this.base}/colleges`); }

  // ── Periodos ──────────────────────────────────────────────
  getPeriods(): Observable<Period[]> { return this.http.get<Period[]>(`${this.base}/periods`); }
  createPeriod(p: { code: string }): Observable<Period> { return this.http.post<Period>(`${this.base}/periods`, p); }
}
