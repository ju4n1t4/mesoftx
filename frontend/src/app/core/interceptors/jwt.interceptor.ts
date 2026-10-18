import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

// Añade el Bearer token a las peticiones de los dos microservicios. Ambos exigen
// autenticación, salvo /public/* (vista pública), al que no se le envía el token.
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth  = inject(AuthService);
  const token = auth.getToken();
  const isUserApi = req.url.startsWith(environment.userApiUrl);
  const isAssesmentApi = req.url.startsWith(environment.assesmentApiUrl);

  const isPublic = req.url.includes('/public/');

  if (token && !isPublic && (isUserApi || isAssesmentApi)) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};
