/**
 * AuthService — gestiona login, logout y sesión JWT contra User_MS.
 * También soporta acceso demo (mock) para recorrer la interfaz sin backend.
 */
import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, switchMap, of, catchError, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CurrentUser, LoginRequest, TokenResponse, User } from '../models/abet.models';

const TOKEN_KEY = 'mesoftx_token';
const USER_KEY  = 'mesoftx_user';

// Credencial de los usuarios institucionales de acceso rápido.
const ACCESS_PASSWORD = 'Mesoftx2026!';

// role_id del seed: 1=Admin, 2=Coordinador, 3=Docente, 4=Evaluador, 5=Estudiante
const ROLE_MAP: Record<number, CurrentUser['role']> = {
  1: 'Admin', 2: 'Coordinador', 3: 'Docente', 4: 'Evaluador', 5: 'Estudiante',
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user = signal<CurrentUser | null>(this._loadUser());
  readonly user   = this._user.asReadonly();
  readonly isAuth = computed(() => !!this._user());
  readonly role   = computed(() => this._user()?.role ?? null);

  constructor(private http: HttpClient, private router: Router) {}

  // ── Login real contra User_MS ──
  login(email: string, password: string): Observable<CurrentUser> {
    const body: LoginRequest = { email, password };
    return this.http.post<TokenResponse>(`${environment.userApiUrl}/auth/login`, body).pipe(
      switchMap(res => {
        localStorage.setItem(TOKEN_KEY, res.access_token);
        const decoded = this._decodeJwt(res.access_token);
        const userId  = Number(decoded?.sub ?? 0);
        const roleId  = Number(decoded?.role_id ?? 3);

        // El token ya está guardado → el interceptor lo enviará al GET /users/{id}
        return this.http.get<User>(`${environment.userApiUrl}/users/${userId}`).pipe(
          catchError(() => of<User>({
            id: userId, name: email.split('@')[0], surname: '', code: '', email,
            active: true, role_id: roleId, career_id: 0, subject_ids: [],
          } as User)),
          tap(u => {
            const current: CurrentUser = {
              id: u.id, name: u.name, surname: u.surname, email: u.email, code: u.code,
              role_id: u.role_id, role: ROLE_MAP[u.role_id] ?? 'Docente',
              career_id: u.career_id, subject_ids: u.subject_ids ?? [], active: u.active,
            };
            this._setUser(current);
            this._redirectByRole(current.role);
          }),
          // devolvemos el CurrentUser
          switchMap(() => of(this._user()!)),
        );
      }),
    );
  }

  // ── Acceso rápido con usuarios institucionales ──
  loginAsDocente(): void {
    this.login('docente@unab.edu.co', ACCESS_PASSWORD).subscribe({
      error: () => this._fallbackSession('Docente'),
    });
  }

  loginAsCoordinador(): void {
    this.login('coordinador@unab.edu.co', ACCESS_PASSWORD).subscribe({
      error: () => this._fallbackSession('Coordinador'),
    });
  }

  // Sesión de respaldo si el backend no responde (solo navegación de UI).
  private _fallbackSession(role: 'Docente' | 'Coordinador'): void {
    const isDocente = role === 'Docente';
    this._setUser({
      id: isDocente ? 99 : 98,
      name: role, surname: '',
      email: isDocente ? 'docente@unab.edu.co' : 'coordinador@unab.edu.co',
      code: isDocente ? 'DOC-DEMO' : 'COO-DEMO',
      role_id: isDocente ? 3 : 2, role,
      career_id: 1, subject_ids: isDocente ? [1, 2] : [], active: true,
    });
    localStorage.setItem(TOKEN_KEY, isDocente ? 'demo-token-docente' : 'demo-token-coordinador');
    this.router.navigate([isDocente ? '/docente/inicio' : '/coordinador']);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('mesoftx_students');
    this._user.set(null);
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null { return localStorage.getItem(TOKEN_KEY); }
  isDemo(): boolean {
    const t = this.getToken();
    return t === 'demo-token-docente' || t === 'demo-token-coordinador';
  }

  // ── Helpers ──
  private _setUser(user: CurrentUser): void {
    this._user.set(user);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  private _loadUser(): CurrentUser | null {
    try { const raw = localStorage.getItem(USER_KEY); return raw ? JSON.parse(raw) : null; }
    catch { return null; }
  }
  private _decodeJwt(token: string): any {
    try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
  }
  private _redirectByRole(role: string): void {
    if (role === 'Docente') this.router.navigate(['/docente/inicio']);
    else this.router.navigate(['/coordinador']);
  }
}
