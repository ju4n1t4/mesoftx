import { Routes } from '@angular/router';

import { authGuard } from './modules/auth/application/guards/auth.guard';
import { AppShellComponent } from './shared/ui/templates/app-shell/app-shell.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./modules/auth/presentation/pages/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./modules/base-config/presentation/pages/dashboard/dashboard.component').then((m) => m.DashboardComponent)
      },
      {
        path: 'programas',
        loadComponent: () => import('./modules/base-config/presentation/pages/programs/programs.component').then((m) => m.ProgramsComponent)
      },
      {
        path: 'usuarios',
        loadComponent: () => import('./modules/base-config/presentation/pages/users/users.component').then((m) => m.UsersComponent)
      },
      {
        path: 'student-outcomes',
        loadComponent: () => import('./modules/base-config/presentation/pages/rubrics/rubrics.component').then((m) => m.RubricsComponent)
      },
      {
        path: 'configuracion',
        loadComponent: () => import('./modules/base-config/presentation/pages/external-connections/external-connections.component').then((m) => m.ExternalConnectionsComponent)
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
