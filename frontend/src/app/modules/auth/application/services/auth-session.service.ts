import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { SessionStorageService } from '../../../../shared/session-storage/session-storage.service';
import { LoginCredentials, TokenResponse } from '../../domain/models/auth.models';
import { AuthenticateUseCase } from '../use-cases/authenticate.usecase';

const TOKEN_KEY = 'mesoftx_access_token';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly authenticateUseCase = inject(AuthenticateUseCase);
  private readonly router = inject(Router);
  private readonly sessionStorage = inject(SessionStorageService);
  private readonly tokenState = signal<string | null>(this.sessionStorage.get(TOKEN_KEY));
  readonly isAuthenticated = computed(() => Boolean(this.tokenState()));

  login(credentials: LoginCredentials): Observable<TokenResponse> {
    return this.authenticateUseCase.login(credentials).pipe(tap((response) => this.setToken(response.access_token)));
  }

  loginWithGoogle(idToken: string): Observable<TokenResponse> {
    return this.authenticateUseCase.loginWithGoogle(idToken).pipe(tap((response) => this.setToken(response.access_token)));
  }

  logout(): void {
    this.sessionStorage.remove(TOKEN_KEY);
    this.tokenState.set(null);
    void this.router.navigateByUrl('/login');
  }

  getToken(): string | null {
    return this.tokenState();
  }

  private setToken(token: string): void {
    this.sessionStorage.set(TOKEN_KEY, token);
    this.tokenState.set(token);
  }
}
