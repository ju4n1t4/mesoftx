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

  // ── Módulo Profesor ────────────────────────────────────────────────────
  {
    path: 'profesor',
    loadComponent: () => import('./layout/profesor-layout/profesor-layout.component').then(m => m.ProfesorLayoutComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Profesor'] },
    children: [
      { path: '', redirectTo: 'mis-cursos', pathMatch: 'full' },
      {
        path: 'mis-cursos',
        loadComponent: () => import('./features/profesor/mis-cursos/mis-cursos.component').then(m => m.MisCursosComponent),
      },
      {
        path: 'estudiantes/:nrc',
        loadComponent: () => import('./features/profesor/estudiantes/estudiantes.component').then(m => m.EstudiantesComponent),
      },
      {
        path: 'valorar',
        loadComponent: () => import('./features/profesor/valorar/valorar.component').then(m => m.ValorarComponent),
      },
      {
        path: 'inicio',
        loadComponent: () => import('./features/profesor/inicio-acreditacion/inicio-acreditacion.component').then(m => m.InicioAcreditacionComponent),
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/profesor/dashboard/profesor-dashboard.component').then(m => m.ProfesorDashboardComponent),
      },
      {
        path: 'valoraciones',
        loadComponent: () => import('./features/profesor/valoraciones/registrar/registrar-valoracion.component').then(m => m.RegistrarValoracionComponent),
      },
      {
        path: 'valoraciones/registrar',
        loadComponent: () => import('./features/profesor/valoraciones/registrar/registrar-valoracion.component').then(m => m.RegistrarValoracionComponent),
      },
      {
        path: 'mis-estudiantes',
        loadComponent: () => import('./features/profesor/mis-estudiantes/mis-estudiantes.component').then(m => m.MisEstudiantesComponent),
      },
      {
        path: 'indicadores',
        loadComponent: () => import('./features/profesor/indicadores/indicadores.component').then(m => m.IndicadoresComponent),
      },
      {
        path: 'soporte',
        loadComponent: () => import('./features/profesor/soporte/soporte.component').then(m => m.SoporteComponent),
      },
    ],
  },

  // ── Módulo Coordinador ─────────────────────────────────────────────────
  {
    path: 'coordinador',
    loadComponent: () => import('./layout/coordinador-layout/coordinador-layout.component').then(m => m.CoordinadorLayoutComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Coordinador'] },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/coordinador/dashboard/coord-dashboard.component').then(m => m.CoordDashboardComponent),
      },
      {
        path: 'programas',
        canActivate: [roleGuard],
        data: { roles: ['Coordinador'] },
        loadComponent: () => import('./features/coordinador/programas/programas.component').then(m => m.ProgramasComponent),
      },
      {
        path: 'materias',
        data: { roles: ['Coordinador', 'Administrativo'] },
        loadComponent: () => import('./features/coordinador/materias/materias.component').then(m => m.MateriasComponent),
      },
      {
        path: 'asignacion-materias',
        data: { roles: ['Coordinador', 'Administrativo'] },
        loadComponent: () => import('./features/coordinador/asignacion-materias/asignacion-materias.component').then(m => m.AsignacionMateriasComponent),
      },
      {
        path: 'programacion',
        data: { roles: ['Coordinador', 'Administrativo'] },
        loadComponent: () => import('./features/coordinador/programacion/programacion.component').then(m => m.ProgramacionComponent),
      },
      {
        path: 'profesores',
        loadComponent: () => import('./features/coordinador/profesores/profesores.component').then(m => m.ProfesoresComponent),
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
      {
        path: 'asignacion',
        loadComponent: () => import('./features/coordinador/asignacion/asignacion.component').then(m => m.AsignacionComponent),
      },
    ],
  },

  // ── Módulo Administrativo ──────────────────────────────────────────────
  {
    path: 'admin',
    loadComponent: () => import('./layout/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Administrativo'] },
    children: [
      { path: '', redirectTo: 'perfiles', pathMatch: 'full' },
      { path: 'perfiles', loadComponent: () => import('./features/admin/perfiles/perfiles.component').then(m => m.PerfilesComponent) },
      { path: 'usuarios', loadComponent: () => import('./features/admin/usuarios/usuarios.component').then(m => m.UsuariosComponent) },
    ],
  },

  // ── Módulo Auditor ─────────────────────────────────────────────────────
  {
    path: 'auditor',
    loadComponent: () => import('./layout/auditor-layout/auditor-layout.component').then(m => m.AuditorLayoutComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Auditor'] },
    children: [
      { path: '', redirectTo: 'indicadores', pathMatch: 'full' },
      { path: 'indicadores', loadComponent: () => import('./features/auditor/indicadores/auditor-indicadores.component').then(m => m.AuditorIndicadoresComponent) },
    ],
  },

  // Fallback
  { path: '**', redirectTo: '' },
];
