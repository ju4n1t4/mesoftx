import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // Landing
  {
    path: '',
    loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent),
  },

  // Auth
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },

  // Vista pública ABET (standalone, sin auth)
  {
    path: 'publico',
    loadComponent: () => import('./features/publico/publico.component').then(m => m.PublicoComponent),
  },

  // ── Módulo Docente ─────────────────────────────────────────────────────
  {
    path: 'docente',
    loadComponent: () => import('./layout/docente-layout/docente-layout.component').then(m => m.DocenteLayoutComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Docente', 'Admin'] },
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      {
        path: 'inicio',
        loadComponent: () => import('./features/docente/inicio-acreditacion/inicio-acreditacion.component').then(m => m.InicioAcreditacionComponent),
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/docente/dashboard/docente-dashboard.component').then(m => m.DocenteDashboardComponent),
      },
      {
        path: 'valoraciones',
        loadComponent: () => import('./features/docente/valoraciones/registrar/registrar-valoracion.component').then(m => m.RegistrarValoracionComponent),
      },
      {
        path: 'valoraciones/registrar',
        loadComponent: () => import('./features/docente/valoraciones/registrar/registrar-valoracion.component').then(m => m.RegistrarValoracionComponent),
      },
      {
        path: 'mis-estudiantes',
        loadComponent: () => import('./features/docente/mis-estudiantes/mis-estudiantes.component').then(m => m.MisEstudiantesComponent),
      },
      {
        path: 'indicadores',
        loadComponent: () => import('./features/docente/indicadores/indicadores.component').then(m => m.IndicadoresComponent),
      },
      {
        path: 'soporte',
        loadComponent: () => import('./features/docente/soporte/soporte.component').then(m => m.SoporteComponent),
      },
    ],
  },

  // ── Módulo Coordinador ─────────────────────────────────────────────────
  {
    path: 'coordinador',
    loadComponent: () => import('./layout/coordinador-layout/coordinador-layout.component').then(m => m.CoordinadorLayoutComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Coordinador', 'Admin'] },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/coordinador/dashboard/coord-dashboard.component').then(m => m.CoordDashboardComponent),
      },
      {
        path: 'programas',
        loadComponent: () => import('./features/coordinador/programas/programas.component').then(m => m.ProgramasComponent),
      },
      {
        path: 'docentes',
        loadComponent: () => import('./features/coordinador/docentes/docentes.component').then(m => m.DocentesComponent),
      },
      {
        path: 'student-outcomes',
        loadComponent: () => import('./features/coordinador/student-outcomes/student-outcomes.component').then(m => m.StudentOutcomesComponent),
      },
      {
        path: 'valoraciones',
        loadComponent: () => import('./features/coordinador/valoraciones/coord-valoraciones.component').then(m => m.CoordValoracionesComponent),
      },
      {
        path: 'auditoria',
        loadComponent: () => import('./features/coordinador/auditoria/auditoria.component').then(m => m.AuditoriaComponent),
      },
      {
        path: 'informes',
        loadComponent: () => import('./features/coordinador/informes/informes.component').then(m => m.InformesComponent),
      },
      {
        path: 'periodos',
        loadComponent: () => import('./features/coordinador/periodos/periodos.component').then(m => m.PeriodosComponent),
      },
      {
        path: 'configuracion',
        loadComponent: () => import('./features/coordinador/configuracion/configuracion.component').then(m => m.ConfiguracionComponent),
      },
    ],
  },

  // Fallback
  { path: '**', redirectTo: '' },
];
