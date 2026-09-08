import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { AppShellComponent } from './layout/app-shell.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent)
  },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent)
      },
      {
        path: 'programas',
        loadComponent: () => import('./features/configuration/programs.component').then((m) => m.ProgramsComponent)
      },
      {
        path: 'usuarios',
        loadComponent: () => import('./features/configuration/users.component').then((m) => m.UsersComponent)
      },
      {
        path: 'student-outcomes',
        loadComponent: () => import('./features/configuration/rubrics.component').then((m) => m.RubricsComponent)
      },
      {
        path: 'configuracion',
        loadComponent: () => import('./features/configuration/external-connections.component').then((m) => m.ExternalConnectionsComponent)
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
