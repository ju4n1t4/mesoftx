import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { LoginCredentials, TokenResponse } from '../../domain/models/auth.models';
import { UserMsAuthGateway } from '../../infra/gateways/user-ms-auth.gateway';

@Injectable({ providedIn: 'root' })
export class AuthenticateUseCase {
  constructor(private readonly authGateway: UserMsAuthGateway) {}

  login(credentials: LoginCredentials): Observable<TokenResponse> {
    return this.authGateway.login(credentials);
  }

  loginWithGoogle(idToken: string): Observable<TokenResponse> {
    return this.authGateway.loginWithGoogle(idToken);
  }
}
