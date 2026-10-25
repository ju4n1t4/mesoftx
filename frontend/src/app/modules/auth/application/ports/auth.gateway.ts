import { Observable } from 'rxjs';
import { AuthMode, TokenResponse } from '../../domain/models/session.models';
import { User } from '../../../base-config/domain/models/abet.models';

export abstract class AuthGateway {
  abstract login(email: string, password: string): Observable<TokenResponse>;
  abstract mode(): Observable<AuthMode>;
  abstract demoLogin(role: string): Observable<TokenResponse>;
  abstract user(id: number): Observable<User>;
}
