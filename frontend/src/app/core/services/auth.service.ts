import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { TokenResponse } from '../models/api.models';

const TOKEN_KEY = 'mesoftx_access_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenState = signal<string | null>(sessionStorage.getItem(TOKEN_KEY));
  readonly isAuthenticated = computed(() => Boolean(this.tokenState()));

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  login(email: string, password: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${environment.userMsApiUrl}/auth/login`, { email, password }).pipe(
      tap((response) => this.setToken(response.access_token))
    );
  }

  loginWithGoogle(idToken: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${environment.userMsApiUrl}/auth/google`, { id_token: idToken }).pipe(
      tap((response) => this.setToken(response.access_token))
    );
  }

  logout(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    this.tokenState.set(null);
    void this.router.navigateByUrl('/login');
  }

  getToken(): string | null {
    return this.tokenState();
  }

  private setToken(token: string): void {
    sessionStorage.setItem(TOKEN_KEY, token);
    this.tokenState.set(token);
  }
}
