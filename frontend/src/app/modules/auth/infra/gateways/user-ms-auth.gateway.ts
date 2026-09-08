import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environment/environment';
import { AuthGateway } from '../../application/ports/auth.gateway';
import { LoginCredentials, TokenResponse } from '../../domain/models/auth.models';

@Injectable({ providedIn: 'root' })
export class UserMsAuthGateway extends AuthGateway {
  constructor(private readonly http: HttpClient) {
    super();
  }

  login(credentials: LoginCredentials): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${environment.userMsApiUrl}/auth/login`, credentials);
  }

  loginWithGoogle(idToken: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${environment.userMsApiUrl}/auth/google`, { id_token: idToken });
  }
}
