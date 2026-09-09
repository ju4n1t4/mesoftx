/**
 * UserApiService — consume el microservicio User_MS (:8001/api/v1).
 * Todos los endpoints (salvo /auth/login) requieren JWT; el interceptor lo añade.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  User, UserCreate, Role, Career, Subject, Faculty,
  Year, Period, AcademicPeriod,
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

  // ── Carreras ──────────────────────────────────────────────
  getCareers(): Observable<Career[]>      { return this.http.get<Career[]>(`${this.base}/careers`); }
  getCareer(id: number): Observable<Career> { return this.http.get<Career>(`${this.base}/careers/${id}`); }

  // ── Asignaturas ───────────────────────────────────────────
  getSubjects(): Observable<Subject[]> { return this.http.get<Subject[]>(`${this.base}/subjects`); }

  // ── Facultades (endpoint singular en el backend) ──────────
  getFaculties(): Observable<Faculty[]> { return this.http.get<Faculty[]>(`${this.base}/faculty`); }

  // ── Años ──────────────────────────────────────────────────
  getYears(): Observable<Year[]> { return this.http.get<Year[]>(`${this.base}/years`); }
  createYear(y: { year: number }): Observable<Year> { return this.http.post<Year>(`${this.base}/years`, y); }

  // ── Periodos ──────────────────────────────────────────────
  getPeriods(): Observable<Period[]> { return this.http.get<Period[]>(`${this.base}/periods`); }
  createPeriod(p: { period: string }): Observable<Period> { return this.http.post<Period>(`${this.base}/periods`, p); }

  // ── Periodos académicos ───────────────────────────────────
  getAcademicPeriods(): Observable<AcademicPeriod[]> { return this.http.get<AcademicPeriod[]>(`${this.base}/academic-periods`); }
  createAcademicPeriod(ap: Omit<AcademicPeriod, 'id'>): Observable<AcademicPeriod> {
    return this.http.post<AcademicPeriod>(`${this.base}/academic-periods`, ap);
  }
}
