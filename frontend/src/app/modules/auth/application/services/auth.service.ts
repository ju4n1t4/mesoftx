import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { tap, switchMap, of, catchError, Observable, throwError } from 'rxjs';
import { AuthMode, CurrentUser } from '../../domain/models/session.models';
import { AuthGateway } from '../ports/auth.gateway';
import { SessionStorageService } from '../../../../shared/session-storage/session-storage.service';

const TOKEN_KEY = 'mesoftx_token';
const USER_KEY = 'mesoftx_user';
interface JwtClaims { sub: string; exp: number; role_id: number; role?: string; perms?: string[]; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user = signal<CurrentUser | null>(null);
  readonly user = this._user.asReadonly();
  readonly isAuth = computed(() => !!this._user());
  readonly role = computed(() => this._user()?.role ?? null);
  readonly isDemo = computed(() => (this._user()?.email ?? '').toLowerCase().endsWith('@demo.mesoftx.local'));

  constructor(private gateway: AuthGateway, private router: Router, private storage: SessionStorageService) {
    this.restore();
  }
  login(email: string, password: string): Observable<CurrentUser> {
    return this.gateway.login(email, password).pipe(switchMap(res => this.startSession(res.access_token)));
  }
  getAuthMode(): Observable<AuthMode> {
    return this.gateway.mode().pipe(catchError(() => of({ demo_enabled: false, demo_roles: [] })));
  }
  demoLogin(role: string): Observable<CurrentUser> {
    return this.gateway.demoLogin(role).pipe(switchMap(res => this.startSession(res.access_token)));
  }
  hasPermission(code: string): boolean { return this._user()?.permissions.includes(code) ?? false; }
  hasValidSession(): boolean {
    const claims = this.decode(this.getToken());
    if (!claims || !this._user()) { this.clear(); return false; }
    return true;
  }
  logout(): void { this.clear(); this.router.navigate(['/auth/login']); }
  getToken(): string | null { return this.storage.get(TOKEN_KEY); }

  private startSession(token: string): Observable<CurrentUser> {
    const claims = this.decode(token);
    if (!claims) { this.clear(); return throwError(() => new Error('Invalid or expired session.')); }
    this.storage.set(TOKEN_KEY, token);
    return this.gateway.user(Number(claims.sub)).pipe(
      switchMap(user => {
        if (!user.active || user.id !== Number(claims.sub)) return throwError(() => new Error('Inactive or invalid account.'));
        const current: CurrentUser = {
          id: user.id, name: user.name, email: user.email ?? '', document_number: user.document_number,
          role_id: user.role_id, role: claims.role ?? null, permissions: claims.perms ?? [],
          program_id: user.program_id ?? null, active: user.active,
        };
        this._user.set(current);
        this.storage.set(USER_KEY, JSON.stringify(current));
        return of(current);
      }),
      tap(user => this.redirect(user.role)),
      catchError(error => { this.clear(); return throwError(() => error); }),
    );
  }
  private restore(): void {
    try {
      const claims = this.decode(this.getToken());
      const raw = this.storage.get(USER_KEY);
      const user = raw ? JSON.parse(raw) as CurrentUser : null;
      if (claims && user?.active && user.id === Number(claims.sub)) {
        this._user.set({ ...user, role: claims.role ?? null, permissions: claims.perms ?? [] });
      } else this.clear();
    } catch { this.clear(); }
  }
  private clear(): void {
    this.storage.remove(TOKEN_KEY); this.storage.remove(USER_KEY); this._user.set(null);
  }
  private decode(token: string | null): JwtClaims | null {
    try {
      if (!token) return null;
      const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const claims = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(encoded), c => c.charCodeAt(0)))) as JwtClaims;
      if (!Number.isInteger(Number(claims.sub)) || Number(claims.sub) <= 0 || !claims.exp || claims.exp * 1000 <= Date.now()) return null;
      return claims;
    } catch { return null; }
  }
  private redirect(role: string | null): void {
    const routes: Record<string, string> = { Profesor: '/profesor/dashboard', Administrativo: '/admin/dashboard',
      Coordinador: '/coordinador/dashboard', Auditor: '/auditor/dashboard' };
    this.router.navigate([role ? routes[role] ?? '/cuenta' : '/cuenta']);
  }
}
