import { IntegrationsGateway } from './modules/base-config/application/ports/integrations.gateway';
import { HttpIntegrationsGateway } from './modules/base-config/infra/gateways/http-integrations.gateway';
import { AuthGateway } from './modules/auth/application/ports/auth.gateway';
import { HttpAuthGateway } from './modules/auth/infra/gateways/http-auth.gateway';
import { UserGateway } from './modules/base-config/application/ports/user-api.service.port';
import { AssesmentGateway } from './modules/base-config/application/ports/assesment-api.service.port';
import { UserApiService } from './modules/base-config/infra/gateways/user-api.service';
import { AssesmentApiService } from './modules/base-config/infra/gateways/assesment-api.service';
import { ApplicationConfig, provideZoneChangeDetection, provideAppInitializer, inject } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';

import { ThemeConfigService } from './shared/services/theme-config.service';

import { routes } from './app.routes';
import { jwtInterceptor } from './modules/auth/application/interceptors/jwt.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: IntegrationsGateway, useClass: HttpIntegrationsGateway },
    { provide: AuthGateway, useClass: HttpAuthGateway },
    { provide: UserGateway, useClass: UserApiService },
    { provide: AssesmentGateway, useClass: AssesmentApiService },
    provideAppInitializer(() => inject(ThemeConfigService).apply()),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([jwtInterceptor])),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: { darkModeSelector: '.dark-mode' },
      },
    }),
  ],
};
