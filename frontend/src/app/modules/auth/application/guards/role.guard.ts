import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth    = inject(AuthService);
  const router  = inject(Router);
  const allowed = (route.data['roles'] ?? []) as string[];
  const permissions = (route.data['permissions'] ?? []) as string[];
  if (!auth.hasValidSession()) return router.createUrlTree(['/auth/login']);
  if (permissions.length) return permissions.some(p => auth.hasPermission(p)) || router.createUrlTree(['/cuenta']);
  const role    = auth.role();
  if (role && allowed.includes(role)) return true;
  return router.createUrlTree(['/auth/login']);
};
