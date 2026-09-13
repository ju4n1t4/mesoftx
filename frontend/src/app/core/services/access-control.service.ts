/**
 * AccessControlService — gestiona la matriz de accesos por rol.
 *
 * Define qué módulos (opciones de la plataforma) puede ver cada rol. La matriz
 * se persiste en el navegador (localStorage) y sirve de base para el control de
 * accesos de la interfaz. Los módulos aquí declarados corresponden a las
 * secciones navegables de la plataforma.
 */
import { Injectable, signal } from '@angular/core';

export interface AppModule {
  key: string;
  label: string;
  description: string;
  route: string;
}

/** Módulos asignables de la plataforma. */
export const APP_MODULES: AppModule[] = [
  { key: 'dashboard',        label: 'Dashboard',          description: 'Panel de indicadores y resumen general.',              route: '/coordinador/dashboard' },
  { key: 'docentes',         label: 'Usuarios y docentes', description: 'Gestión de usuarios, roles y programa académico.',     route: '/coordinador/docentes' },
  { key: 'programas',        label: 'Programas',          description: 'Programas académicos en acreditación ABET.',           route: '/coordinador/programas' },
  { key: 'student-outcomes', label: 'Student Outcomes',   description: 'Parametrización de resultados de aprendizaje y rúbricas.', route: '/coordinador/student-outcomes' },
  { key: 'valoraciones',     label: 'Valoraciones',       description: 'Seguimiento y estado de las valoraciones registradas.', route: '/coordinador/valoraciones' },
  { key: 'auditoria',        label: 'Auditoría',          description: 'Registro de eventos y trazabilidad del sistema.',        route: '/coordinador/auditoria' },
  { key: 'informes',         label: 'Informes',           description: 'Tableros e informes analíticos (Power BI).',            route: '/coordinador/informes' },
  { key: 'periodos',         label: 'Periodos',           description: 'Gestión de periodos y periodos académicos.',           route: '/coordinador/periodos' },
  { key: 'configuracion',    label: 'Configuración',      description: 'Parámetros generales de la plataforma.',               route: '/coordinador/configuracion' },
  { key: 'asignacion',       label: 'Asignación de accesos', description: 'Asignación de permisos por perfil.',                route: '/coordinador/asignacion' },
];

/** Roles del sistema (coinciden con el catálogo de la base de datos). */
export const SYSTEM_ROLES = ['Admin', 'Coordinador', 'Docente'] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

/** Estructura: { [rol]: { [moduloKey]: boolean } } */
export type AccessMatrix = Record<string, Record<string, boolean>>;

const STORAGE_KEY = 'mesoftx.access-matrix.v1';

@Injectable({ providedIn: 'root' })
export class AccessControlService {
  /** Señal reactiva con la matriz vigente. */
  readonly matrix = signal<AccessMatrix>(this.load());

  private defaults(): AccessMatrix {
    const all = (v: boolean) => Object.fromEntries(APP_MODULES.map(m => [m.key, v]));
    return {
      // El administrador gestiona accesos y usuarios.
      Admin: { ...all(false), docentes: true, configuracion: true, asignacion: true },
      // El coordinador opera el proceso completo de acreditación.
      Coordinador: { ...all(true), asignacion: false },
      // El docente no accede al panel de coordinación.
      Docente: all(false),
    };
  }

  private load(): AccessMatrix {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as AccessMatrix;
        // Fusiona con los valores por defecto para incorporar módulos nuevos.
        const base = this.defaults();
        for (const role of Object.keys(base)) {
          base[role] = { ...base[role], ...(saved[role] ?? {}) };
        }
        return base;
      }
    } catch {
      // Si el almacenamiento está corrupto, se reinicia a los valores por defecto.
    }
    return this.defaults();
  }

  /** Persiste una nueva matriz y actualiza la señal. */
  save(next: AccessMatrix): void {
    this.matrix.set(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* almacenamiento no disponible */ }
  }

  /** Cambia el acceso de un rol a un módulo concreto. */
  toggle(role: string, moduleKey: string, value: boolean): void {
    const next: AccessMatrix = structuredClone(this.matrix());
    next[role] = { ...(next[role] ?? {}), [moduleKey]: value };
    this.save(next);
  }

  /** Restaura la matriz por defecto. */
  reset(): void { this.save(this.defaults()); }

  /** Indica si un rol tiene acceso a un módulo. */
  canAccess(role: string, moduleKey: string): boolean {
    return !!this.matrix()[role]?.[moduleKey];
  }
}
