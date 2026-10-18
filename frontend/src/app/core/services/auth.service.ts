/**
 * AuthService — gestiona login, logout y sesión JWT contra User_MS.
 * No existen accesos de demostración ni credenciales incrustadas en el código:
 * toda sesión nace de un login real contra User_MS.
 */
import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, switchMap, of, catchError, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CurrentUser, LoginRequest, TokenResponse, User } from '../models/abet.models';

const TOKEN_KEY = 'mesoftx_token';
const USER_KEY  = 'mesoftx_user';

// Los roles son dinámicos (los crea el admin). El único fijo del bootstrap es
// Administrativo (role_id 1). El resto se resuelve por el claim "role" del JWT.
const ROLE_MAP: Record<number, CurrentUser['role']> = {
  1: 'Administrativo',
};

/** Claims del JWT emitido por User_MS que consume el frontend. */
interface JwtClaims {
  sub?: string | number;
  role_id?: number;
  role?: CurrentUser['role'];
  email?: string;
  program_id?: string | null;
  perms?: string[];
}

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

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._user.set(null);
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null { return localStorage.getItem(TOKEN_KEY); }

  // ── Helpers ──
  private _setUser(user: CurrentUser): void {
    this._user.set(user);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  private _loadUser(): CurrentUser | null {
    try { const raw = localStorage.getItem(USER_KEY); return raw ? JSON.parse(raw) : null; }
    catch { return null; }
  }
  private _decodeJwt(token: string): JwtClaims | null {
    try { return JSON.parse(atob(token.split('.')[1])) as JwtClaims; } catch { return null; }
  }
  private _redirectByRole(role: string): void {
    if (role === 'Profesor') this.router.navigate(['/profesor/dashboard']);
    else if (role === 'Administrativo') this.router.navigate(['/admin/dashboard']);
    else if (role === 'Auditor') this.router.navigate(['/auditor/dashboard']);
    else this.router.navigate(['/coordinador/dashboard']);
  }
}
