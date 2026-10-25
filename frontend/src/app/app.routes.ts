import { Routes } from '@angular/router';
import { authGuard } from './modules/auth/application/guards/auth.guard';
import { roleGuard } from './modules/auth/application/guards/role.guard';

export const routes: Routes = [
  // Landing
  {
    path: '',
    loadComponent: () => import('./modules/base-config/presentation/pages/landing/landing.component').then(m => m.LandingComponent),
  },

  // Auth
  {
    path: 'auth/login',
    loadComponent: () => import('./modules/auth/presentation/pages/login/login.component').then(m => m.LoginComponent),
  },

  // Textos legales (públicos)
  {
    path: 'legal/privacidad',
    data: { doc: 'privacidad' },
    loadComponent: () => import('./modules/base-config/presentation/pages/legal/legal.component').then(m => m.LegalComponent),
  },
  {
    path: 'legal/terminos',
    data: { doc: 'terminos' },
    loadComponent: () => import('./modules/base-config/presentation/pages/legal/legal.component').then(m => m.LegalComponent),
  },

  // Mi cuenta (cualquier usuario autenticado)
  {
    path: 'cuenta',
    canActivate: [authGuard],
    loadComponent: () => import('./modules/base-config/presentation/pages/cuenta/cuenta.component').then(m => m.CuentaComponent),
  },

  // Vista pública ABET (standalone, sin auth)
  {
    path: 'publico',
    loadComponent: () => import('./modules/base-config/presentation/pages/publico/publico.component').then(m => m.PublicoComponent),
  },

  // ── Módulo Profesor ────────────────────────────────────────────────────
  {
    path: 'profesor',
    loadComponent: () => import('./modules/base-config/presentation/layouts/profesor-layout/profesor-layout.component').then(m => m.ProfesorLayoutComponent),
    canActivate: [authGuard, roleGuard],
    canActivateChild: [authGuard],
    data: { roles: ['Profesor'] },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'mis-cursos',
        loadComponent: () => import('./modules/base-config/presentation/pages/profesor/mis-cursos/mis-cursos.component').then(m => m.MisCursosComponent),
      },
      {
        path: 'estudiantes/:nrc',
        loadComponent: () => import('./modules/base-config/presentation/pages/profesor/estudiantes/estudiantes.component').then(m => m.EstudiantesComponent),
      },
      {
        path: 'valorar',
        loadComponent: () => import('./modules/base-config/presentation/pages/profesor/valorar/valorar.component').then(m => m.ValorarComponent),
      },
      {
        path: 'inicio',
        loadComponent: () => import('./modules/base-config/presentation/pages/profesor/inicio-acreditacion/inicio-acreditacion.component').then(m => m.InicioAcreditacionComponent),
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./modules/base-config/presentation/pages/profesor/dashboard/profesor-dashboard.component').then(m => m.ProfesorDashboardComponent),
      },
      {
        path: 'indicadores',
        loadComponent: () => import('./modules/base-config/presentation/pages/profesor/indicadores/indicadores.component').then(m => m.IndicadoresComponent),
      },
      {
        path: 'soporte',
        loadComponent: () => import('./modules/base-config/presentation/pages/profesor/soporte/soporte.component').then(m => m.SoporteComponent),
      },
    ],
  },

  // ── Módulo Coordinador ─────────────────────────────────────────────────
  {
    path: 'coordinador',
    loadComponent: () => import('./modules/base-config/presentation/layouts/coordinador-layout/coordinador-layout.component').then(m => m.CoordinadorLayoutComponent),
    canActivate: [authGuard, roleGuard],
    canActivateChild: [authGuard],
    data: { roles: ['Coordinador'] },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./modules/base-config/presentation/pages/coordinador/dashboard/coord-dashboard.component').then(m => m.CoordDashboardComponent),
      },
      {
        path: 'programas',
        canActivate: [roleGuard],
        data: { roles: ['Coordinador'] },
        loadComponent: () => import('./modules/base-config/presentation/pages/coordinador/programas/programas.component').then(m => m.ProgramasComponent),
      },
      {
        path: 'materias',
        data: { roles: ['Coordinador'] },
        loadComponent: () => import('./modules/base-config/presentation/pages/coordinador/materias/materias.component').then(m => m.MateriasComponent),
      },
      {
        path: 'asignacion-materias',
        data: { roles: ['Coordinador'] },
        loadComponent: () => import('./modules/base-config/presentation/pages/coordinador/asignacion-materias/asignacion-materias.component').then(m => m.AsignacionMateriasComponent),
      },
      {
        path: 'programacion',
        data: { roles: ['Coordinador'] },
        loadComponent: () => import('./modules/base-config/presentation/pages/coordinador/programacion/programacion.component').then(m => m.ProgramacionComponent),
      },
      {
        path: 'avance',
        data: { roles: ['Coordinador'] },
        loadComponent: () => import('./modules/base-config/presentation/pages/coordinador/avance/avance.component').then(m => m.AvanceComponent),
      },
      {
        path: 'indicadores',
        data: { roles: ['Coordinador'] },
        loadComponent: () => import('./modules/base-config/presentation/pages/coordinador/indicadores/indicadores.component').then(m => m.CoordIndicadoresComponent),
      },
      {
        path: 'profesores',
        loadComponent: () => import('./modules/base-config/presentation/pages/coordinador/profesores/profesores.component').then(m => m.ProfesoresComponent),
      },
      {
        path: 'student-outcomes',
        loadComponent: () => import('./modules/base-config/presentation/pages/coordinador/student-outcomes/student-outcomes.component').then(m => m.StudentOutcomesComponent),
      },
      {
        path: 'valoraciones',
        loadComponent: () => import('./modules/base-config/presentation/pages/coordinador/valoraciones/coord-valoraciones.component').then(m => m.CoordValoracionesComponent),
      },
      {
        path: 'periodos',
        loadComponent: () => import('./modules/base-config/presentation/pages/coordinador/periodos/periodos.component').then(m => m.PeriodosComponent),
      },
      {
        path: 'configuracion',
        loadComponent: () => import('./modules/base-config/presentation/pages/coordinador/configuracion/configuracion.component').then(m => m.ConfiguracionComponent),
      },
      {
        path: 'soporte',
        loadComponent: () => import('./modules/base-config/presentation/pages/profesor/soporte/soporte.component').then(m => m.SoporteComponent),
      },
    ],
  },

  // ── Módulo Administrativo ──────────────────────────────────────────────
  {
    path: 'admin',
    loadComponent: () => import('./modules/base-config/presentation/layouts/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [authGuard, roleGuard],
    canActivateChild: [authGuard],
    data: { roles: ['Administrativo'] },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./modules/base-config/presentation/pages/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
      { path: 'integraciones', canActivate: [roleGuard], data: { permissions: ['INTEGRATION_MANAGE'] }, loadComponent: () => import('./modules/base-config/presentation/pages/admin/integraciones/integraciones.component').then(m => m.IntegracionesComponent) },
      { path: 'perfiles', loadComponent: () => import('./modules/base-config/presentation/pages/admin/perfiles/perfiles.component').then(m => m.PerfilesComponent) },
      { path: 'usuarios', loadComponent: () => import('./modules/base-config/presentation/pages/admin/usuarios/usuarios.component').then(m => m.UsuariosComponent) },
      { path: 'periodos', loadComponent: () => import('./modules/base-config/presentation/pages/admin/periodos/periodos.component').then(m => m.PeriodosComponent) },
      { path: 'facultades', loadComponent: () => import('./modules/base-config/presentation/pages/admin/facultades/facultades.component').then(m => m.FacultadesComponent) },
      { path: 'soporte', loadComponent: () => import('./modules/base-config/presentation/pages/profesor/soporte/soporte.component').then(m => m.SoporteComponent) },
    ],
  },

  // ── Módulo Auditor ─────────────────────────────────────────────────────
  {
    path: 'auditor',
    loadComponent: () => import('./modules/base-config/presentation/layouts/auditor-layout/auditor-layout.component').then(m => m.AuditorLayoutComponent),
    canActivate: [authGuard, roleGuard],
    canActivateChild: [authGuard],
    data: { roles: ['Auditor'] },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./modules/base-config/presentation/pages/auditor/indicadores/auditor-indicadores.component').then(m => m.AuditorIndicadoresComponent) },
      { path: 'indicadores', loadComponent: () => import('./modules/base-config/presentation/pages/auditor/indicadores/auditor-indicadores.component').then(m => m.AuditorIndicadoresComponent) },
      { path: 'soporte', loadComponent: () => import('./modules/base-config/presentation/pages/profesor/soporte/soporte.component').then(m => m.SoporteComponent) },
    ],
  },

  // Fallback
  { path: '**', redirectTo: '' },
];
