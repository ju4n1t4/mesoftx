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

// Los roles son dinámicos (los crea el admin). El único fijo del bootstrap es
// Administrativo (role_id 1). El resto se resuelve por el claim "role" del JWT.
const ROLE_MAP: Record<number, CurrentUser['role']> = {
  1: 'Administrativo',
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

        const roleName = (decoded?.role as CurrentUser['role']) ?? ROLE_MAP[roleId] ?? 'Profesor';
        // El token ya está guardado → el interceptor lo enviará al GET /users/{id}
        return this.http.get<User>(`${environment.userApiUrl}/users/${userId}`).pipe(
          catchError(() => of<User>({
            id: userId, document_number: '', name: email.split('@')[0], email,
            active: true, role_id: roleId, program_id: null,
          } as User)),
          tap(u => {
            const current: CurrentUser = {
              id: u.id, name: u.name, email: u.email ?? '', document_number: u.document_number,
              role_id: u.role_id, role: roleName,
              program_id: u.program_id ?? null, active: u.active,
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

  // ── Acceso rápido con usuarios institucionales reales de la BD ──
  loginAsProfesor(): void {
    this.login('jramirez@unab.edu.co', ACCESS_PASSWORD).subscribe({
      error: () => this._fallbackSession('Profesor'),
    });
  }

  loginAsCoordinador(): void {
    this.login('orueda741@unab.edu.co', ACCESS_PASSWORD).subscribe({
      error: () => this._fallbackSession('Coordinador'),
    });
  }

  loginAsAuditor(): void {
    this.login('auditor@unab.edu.co', ACCESS_PASSWORD).subscribe({
      error: () => this._fallbackSession('Auditor'),
    });
  }

  loginAsAdmin(): void {
    this.login('admin@unab.edu.co', ACCESS_PASSWORD).subscribe({
      error: () => this._fallbackSession('Administrativo'),
    });
  }

  // Sesión de respaldo si el backend no responde (solo navegación de UI).
  private _fallbackSession(role: 'Profesor' | 'Coordinador' | 'Auditor' | 'Administrativo'): void {
    const meta = {
      Profesor:       { id: 99, email: 'jramirez@unab.edu.co',  document_number: 'DOC-DEMO', role_id: 3, token: 'demo-token-profesor',    program_id: 'ISI' as string | null, route: '/profesor/mis-cursos' },
      Coordinador:    { id: 98, email: 'orueda741@unab.edu.co', document_number: 'COO-DEMO', role_id: 2, token: 'demo-token-coordinador', program_id: null as string | null, route: '/coordinador' },
      Auditor:        { id: 96, email: 'auditor@unab.edu.co',   document_number: 'AUD-DEMO', role_id: 4, token: 'demo-token-auditor',     program_id: null as string | null, route: '/auditor' },
      Administrativo: { id: 97, email: 'admin@unab.edu.co',     document_number: 'ADM-DEMO', role_id: 1, token: 'demo-token-admin',       program_id: null as string | null, route: '/admin' },
    }[role];

    this._setUser({
      id: meta.id,
      name: role,
      email: meta.email, document_number: meta.document_number,
      role_id: meta.role_id, role,
      program_id: meta.program_id, active: true,
    });
    localStorage.setItem(TOKEN_KEY, meta.token);
    this.router.navigate([meta.route]);
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
    return t === 'demo-token-profesor' || t === 'demo-token-coordinador' || t === 'demo-token-auditor' || t === 'demo-token-admin';
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
    if (role === 'Profesor') this.router.navigate(['/profesor/mis-cursos']);
    else if (role === 'Administrativo') this.router.navigate(['/admin']);
    else if (role === 'Auditor') this.router.navigate(['/auditor']);
    else this.router.navigate(['/coordinador']);
  }
}
