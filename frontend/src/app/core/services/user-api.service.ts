/**
 * UserApiService — consume el microservicio User_MS (port 8001).
 * Todos los endpoints de catálogo requieren JWT (lo añade el jwtInterceptor).
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

  // ── Users ──
  getUsers(): Observable<User[]>              { return this.http.get<User[]>(`${this.base}/users`); }
  getUser(id: number): Observable<User>       { return this.http.get<User>(`${this.base}/users/${id}`); }
  createUser(u: UserCreate): Observable<User> { return this.http.post<User>(`${this.base}/users`, u); }
  updateUser(id: number, u: Partial<UserCreate>): Observable<User> {
    return this.http.put<User>(`${this.base}/users/${id}`, u);
  }
  activateUser(id: number): Observable<User>   { return this.http.patch<User>(`${this.base}/users/${id}/activate`, {}); }
  deactivateUser(id: number): Observable<User> { return this.http.patch<User>(`${this.base}/users/${id}/deactivate`, {}); }

  // ── Roles ──
  getRoles(): Observable<Role[]>                           { return this.http.get<Role[]>(`${this.base}/roles`); }
  createRole(r: { name: string; description?: string }): Observable<Role> {
    return this.http.post<Role>(`${this.base}/roles`, r);
  }

  // ── Careers ──
  getCareers(): Observable<Career[]>            { return this.http.get<Career[]>(`${this.base}/careers`); }
  getCareer(id: number): Observable<Career>     { return this.http.get<Career>(`${this.base}/careers/${id}`); }
  createCareer(c: Omit<Career, 'id'>): Observable<Career> {
    return this.http.post<Career>(`${this.base}/careers`, c);
  }

  // ── Subjects ──
  getSubjects(): Observable<Subject[]>          { return this.http.get<Subject[]>(`${this.base}/subjects`); }
  createSubject(s: Omit<Subject, 'id'>): Observable<Subject> {
    return this.http.post<Subject>(`${this.base}/subjects`, s);
  }

  // ── Faculty (endpoint real: /faculty) ──
  getFaculties(): Observable<Faculty[]>         { return this.http.get<Faculty[]>(`${this.base}/faculty`); }
  createFaculty(f: Omit<Faculty, 'id'>): Observable<Faculty> {
    return this.http.post<Faculty>(`${this.base}/faculty`, f);
  }

  // ── Years ──
  getYears(): Observable<Year[]>                          { return this.http.get<Year[]>(`${this.base}/years`); }
  createYear(y: { year: number }): Observable<Year>       { return this.http.post<Year>(`${this.base}/years`, y); }

  // ── Periods ──
  getPeriods(): Observable<Period[]>                        { return this.http.get<Period[]>(`${this.base}/periods`); }
  createPeriod(p: { period: string }): Observable<Period>   { return this.http.post<Period>(`${this.base}/periods`, p); }

  // ── Academic periods ──
  getAcademicPeriods(): Observable<AcademicPeriod[]> { return this.http.get<AcademicPeriod[]>(`${this.base}/academic-periods`); }
  createAcademicPeriod(ap: Omit<AcademicPeriod, 'id'>): Observable<AcademicPeriod> {
    return this.http.post<AcademicPeriod>(`${this.base}/academic-periods`, ap);
  }
}
