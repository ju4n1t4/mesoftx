import { InputAtom } from '../../../../../../shared/ui/atoms/input/input.directive';
import { ButtonAtom } from '../../../../../../shared/ui/atoms/button/button.directive';
import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

import { UserGateway as UserApiService } from '../../../../application/ports/user-api.service.port';
import { Role, Permission } from '../../../../domain/models/abet.models';

type PermissionAction = {
  label: string;
  code?: string;
};

type PermissionGroup = {
  title: string;
  actions: PermissionAction[];
};

const PERMISSION_GROUPS: PermissionGroup[] = [
  { title: 'Integraciones externas', actions: [{ label: 'Administrar y sincronizar', code: 'INTEGRATION_MANAGE' }] },
  {
    title: 'Rubrica',
    actions: [
      { label: 'Ver', code: 'RUBRIC_VIEW' },
      { label: 'Crear', code: 'RUBRIC_FILL' },
      { label: 'Editar', code: 'RUBRIC_FILL' },
      { label: 'Borrar' },
    ],
  },
  {
    title: 'Desempenos',
    actions: [
      { label: 'Ver', code: 'INDICATOR_VIEW' },
      { label: 'Crear', code: 'SO_CRUD' },
      { label: 'Editar', code: 'SO_CRUD' },
      { label: 'Borrar', code: 'SO_CRUD' },
    ],
  },
  {
    title: 'Indicadores',
    actions: [
      { label: 'Ver', code: 'INDICATOR_VIEW' },
      { label: 'Graficar', code: 'INDICATOR_CHART' },
      { label: 'Crear' },
      { label: 'Editar' },
      { label: 'Borrar' },
    ],
  },
  {
    title: 'Student Outcomes (SO)',
    actions: [
      { label: 'Ver', code: 'SO_TO_ASSESS_VIEW' },
      { label: 'Crear', code: 'SO_CRUD' },
      { label: 'Editar', code: 'SO_CRUD' },
      { label: 'Borrar', code: 'SO_CRUD' },
    ],
  },
  {
    title: 'Programacion SO',
    actions: [
      { label: 'Ver', code: 'SO_TO_ASSESS_VIEW' },
      { label: 'Crear', code: 'SO_SCHEDULE_MANAGE' },
      { label: 'Editar', code: 'SO_SCHEDULE_MANAGE' },
      { label: 'Borrar', code: 'SO_SCHEDULE_MANAGE' },
    ],
  },
  {
    title: 'Evidencias',
    actions: [
      { label: 'Ver' },
      { label: 'Subir', code: 'EVIDENCE_UPLOAD' },
      { label: 'Editar' },
      { label: 'Borrar' },
    ],
  },
  {
    title: 'Estudiantes',
    actions: [
      { label: 'Ver' },
      { label: 'Cargar', code: 'STUDENT_UPLOAD' },
      { label: 'Editar' },
      { label: 'Borrar' },
    ],
  },
  {
    title: 'Cursos',
    actions: [
      { label: 'Ver', code: 'MY_COURSES_VIEW' },
      { label: 'Crear' },
      { label: 'Editar' },
      { label: 'Borrar' },
    ],
  },
  {
    title: 'Profesores',
    actions: [
      { label: 'Ver', code: 'TEACHER_CRUD' },
      { label: 'Crear', code: 'TEACHER_CRUD' },
      { label: 'Editar', code: 'TEACHER_CRUD' },
      { label: 'Borrar', code: 'TEACHER_CRUD' },
    ],
  },
  {
    title: 'Materias',
    actions: [
      { label: 'Ver', code: 'SUBJECT_CRUD' },
      { label: 'Crear', code: 'SUBJECT_CRUD' },
      { label: 'Editar', code: 'SUBJECT_CRUD' },
      { label: 'Borrar', code: 'SUBJECT_CRUD' },
    ],
  },
  {
    title: 'Estructura academica',
    actions: [
      { label: 'Ver', code: 'PROGRAM_CRUD' },
      { label: 'Crear', code: 'PROGRAM_CRUD' },
      { label: 'Editar', code: 'PROGRAM_CRUD' },
      { label: 'Borrar', code: 'PROGRAM_CRUD' },
    ],
  },
  {
    title: 'Usuarios y perfiles',
    actions: [
      { label: 'Ver', code: 'USER_CRUD' },
      { label: 'Crear', code: 'USER_CRUD' },
      { label: 'Editar', code: 'USER_CRUD' },
      { label: 'Borrar', code: 'USER_CRUD' },
      { label: 'Asignar permisos', code: 'PERMISSION_ASSIGN' },
    ],
  },
  {
    title: 'Dashboards',
    actions: [
      { label: 'Programa', code: 'DASHBOARD_PROGRAM' },
      { label: 'Profesor', code: 'DASHBOARD_TEACHER' },
      { label: 'SO', code: 'DASHBOARD_SO' },
    ],
  },
];

@Component({
  selector: 'app-perfiles',
  standalone: true,
  imports: [InputAtom, ButtonAtom, 
    CommonModule, ReactiveFormsModule,
    TableModule, ButtonModule, DialogModule, InputTextModule,
    ToastModule, ProgressSpinnerModule, ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './perfiles.component.html',
  styleUrl: './perfiles.component.scss',
})
export class PerfilesComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  loadingPerms = signal(false);
  editing = signal(false);
  roleVisible = false;
  permVisible = false;

  roles = signal<Role[]>([]);
  permissions = signal<Permission[]>([]);
  private editId = signal<number | null>(null);
  private permTargetSig = signal<Role | null>(null);
  permissionGroups = PERMISSION_GROUPS;

  roleForm: FormGroup;
  permCtrl = new FormControl<string[]>([], { nonNullable: true });

  permTarget = computed(() => this.permTargetSig());
  availablePermissionCodes = computed(() => new Set(this.permissions().map(p => p.code)));

  constructor(
    private fb: FormBuilder,
    private userApi: UserApiService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {
    this.roleForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      description: ['', [Validators.maxLength(255)]],
    });
  }

  ngOnInit(): void {
    forkJoin({ roles: this.userApi.getRoles(), perms: this.userApi.getPermissions() }).subscribe({
      next: ({ roles, perms }) => { this.roles.set(roles ?? []); this.permissions.set(perms ?? []); this.loading.set(false); },
      error: e => { this.showError(e); this.loading.set(false); },
    });
  }

  private reloadRoles(): void {
    this.userApi.getRoles().subscribe({ next: r => this.roles.set(r ?? []), error: e => this.showError(e) });
  }

  showErr(ctrl: string): boolean {
    const c = this.roleForm.get(ctrl); return !!c && c.invalid && (c.dirty || c.touched);
  }

  trackPermissionGroup(_: number, group: PermissionGroup): string { return group.title; }

  trackPermissionAction(index: number, action: PermissionAction): string {
    return `${action.code ?? 'future'}-${action.label}-${index}`;
  }

  isActionEnabled(action: PermissionAction): boolean {
    return !!action.code && this.availablePermissionCodes().has(action.code);
  }

  isActionSelected(action: PermissionAction): boolean {
    return this.isActionEnabled(action) && !!action.code && this.permCtrl.value.includes(action.code);
  }

  togglePermissionAction(action: PermissionAction, checked: boolean): void {
    if (!this.isActionEnabled(action) || !action.code) return;
    const current = new Set(this.permCtrl.value);
    if (checked) current.add(action.code);
    else current.delete(action.code);
    this.permCtrl.setValue(Array.from(current));
  }

  openCreate(): void { this.editing.set(false); this.editId.set(null); this.roleForm.reset({ name: '', description: '' }); this.roleVisible = true; }
  openEdit(r: Role): void { this.editing.set(true); this.editId.set(r.id); this.roleForm.reset({ name: r.name, description: r.description ?? '' }); this.roleVisible = true; }

  saveRole(): void {
    if (this.roleForm.invalid) { this.roleForm.markAllAsTouched(); return; }
    this.saving.set(true);
    const { name, description } = this.roleForm.getRawValue();
    const body = { name: name as string, description: (description as string) || undefined };
    const done = () => { this.saving.set(false); this.roleVisible = false; this.reloadRoles(); };
    const id = this.editId();
    const obs = id == null ? this.userApi.createRole(body) : this.userApi.updateRole(id, body);
    obs.subscribe({
      next: () => { this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Perfil guardado.' }); done(); },
      error: e => { this.saving.set(false); this.showError(e); },
    });
  }

  openPermissions(r: Role): void {
    // El PUT reemplaza el set completo de permisos. Por eso NUNCA se abre el
    // diálogo en vacío: se precargan los permisos actuales con GET
    // /roles/{id}/permissions. Si el GET falla, no se abre el diálogo (evita
    // que al guardar se borren sin querer los permisos que el rol ya tenía).
    this.loadingPerms.set(true);
    this.userApi.getRolePermissions(r.id).subscribe({
      next: codes => {
        this.permTargetSig.set(r);
        this.permCtrl.setValue(codes ?? []);
        this.loadingPerms.set(false);
        this.permVisible = true;
      },
      error: e => {
        this.loadingPerms.set(false);
        this.showError(e);
      },
    });
  }

  savePermissions(): void {
    const r = this.permTargetSig(); if (!r) return;
    this.saving.set(true);
    this.userApi.setRolePermissions(r.id, this.permCtrl.value).subscribe({
      next: () => { this.saving.set(false); this.permVisible = false; this.messageService.add({ severity: 'success', summary: 'Permisos', detail: `Permisos de ${r.name} actualizados.` }); },
      error: e => { this.saving.set(false); this.showError(e); },
    });
  }

  confirmDelete(r: Role): void {
    this.confirmationService.confirm({
      header: 'Borrar perfil',
      message: `¿Borrar el perfil ${r.name}? Si tiene usuarios asignados, el sistema lo impedirá.`,
      icon: 'pi pi-exclamation-triangle', acceptLabel: 'Borrar', rejectLabel: 'Cancelar',
      accept: () => this.userApi.deleteRole(r.id).subscribe({
        next: () => { this.messageService.add({ severity: 'success', summary: 'Borrado', detail: 'Perfil borrado.' }); this.reloadRoles(); },
        error: e => this.showError(e),   // 409 "tiene N usuarios asignados" -> detail
      }),
    });
  }

  private showError(err: HttpErrorResponse): void {
    let detail: string;
    if (err.status === 503) detail = 'Servicio no disponible, intenta en unos segundos';
    else if (err.status === 404) detail = 'No encontrado';
    else detail = typeof err.error?.detail === 'string' ? err.error.detail : 'Ocurrió un error inesperado';
    this.messageService.add({ severity: 'error', summary: `Error ${err.status}`, detail });
  }
}
