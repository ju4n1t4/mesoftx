import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

// Añade el Bearer token solo a las peticiones del User_MS, que es quien
// exige autenticación. El Assesment_MS expone sus endpoints de forma pública
// y su CORS no admite la cabecera Authorization.
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth  = inject(AuthService);
  const token = auth.getToken();
  const isUserApi = req.url.startsWith(environment.userApiUrl);

  if (token && !auth.isDemo() && isUserApi) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};
