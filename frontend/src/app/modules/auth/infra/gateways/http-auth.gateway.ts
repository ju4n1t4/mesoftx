import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { AuthGateway } from '../../application/ports/auth.gateway';
import { AuthMode, TokenResponse } from '../../domain/models/session.models';
import { User } from '../../../base-config/domain/models/abet.models';

@Injectable({ providedIn: 'root' })
export class HttpAuthGateway extends AuthGateway {
  private readonly base = environment.userApiUrl;
  constructor(private http: HttpClient) { super(); }
  login(email: string, password: string) { return this.http.post<TokenResponse>(`${this.base}/auth/login`, { email, password }); }
  mode() { return this.http.get<AuthMode>(`${this.base}/auth/mode`); }
  demoLogin(role: string) { return this.http.post<TokenResponse>(`${this.base}/auth/demo-login`, { role }); }
  user(id: number) { return this.http.get<User>(`${this.base}/users/${id}`); }
}
