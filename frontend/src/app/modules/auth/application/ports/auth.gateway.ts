import { Observable } from 'rxjs';

import { LoginCredentials, TokenResponse } from '../../domain/models/auth.models';

export abstract class AuthGateway {
  abstract login(credentials: LoginCredentials): Observable<TokenResponse>;
  abstract loginWithGoogle(idToken: string): Observable<TokenResponse>;
}
