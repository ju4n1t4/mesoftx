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

import { UserApiService } from '../../../core/services/user-api.service';
import { Role, Permission } from '../../../core/models/abet.models';

type PermissionAction = {
  label: string;
  code?: string;
};

type PermissionGroup = {
  title: string;
  actions: PermissionAction[];
};

const PERMISSION_GROUPS: PermissionGroup[] = [
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
  imports: [
    CommonModule, ReactiveFormsModule,
    TableModule, ButtonModule, DialogModule, InputTextModule,
    ToastModule, ProgressSpinnerModule, ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast></p-toast>
    <p-confirmDialog></p-confirmDialog>
    <div class="content-area">
      <div class="page-header">
        <h1>Perfiles y permisos</h1>
        <p>Crea los perfiles del sistema y define qué permisos tiene cada uno.</p>
      </div>

      <div class="toolbar">
        <button pButton type="button" label="Nuevo perfil" icon="pi pi-plus" (click)="openCreate()"></button>
      </div>

      <div class="loading-wrap" *ngIf="loading()">
        <p-progressSpinner strokeWidth="4" [style]="{ width: '40px', height: '40px' }"></p-progressSpinner>
      </div>

      <p-table *ngIf="!loading()" [value]="roles()" styleClass="p-datatable-sm" [rowHover]="true">
        <ng-template pTemplate="header"><tr><th>Perfil</th><th>Descripción</th><th style="width:14rem">Acciones</th></tr></ng-template>
        <ng-template pTemplate="body" let-r>
          <tr>
            <td>{{ r.name }}</td>
            <td>{{ r.description || '—' }}</td>
            <td class="actions">
              <button pButton type="button" label="Permisos" icon="pi pi-shield" class="p-button-sm p-button-secondary" [disabled]="loadingPerms()" (click)="openPermissions(r)"></button>
              <button pButton type="button" icon="pi pi-pencil" class="p-button-sm p-button-text" (click)="openEdit(r)"></button>
              <button pButton type="button" icon="pi pi-trash" class="p-button-sm p-button-text p-button-danger" (click)="confirmDelete(r)"></button>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="3" class="empty-cell">No hay perfiles. Crea el primero.</td></tr></ng-template>
      </p-table>
    </div>

    <!-- Crear / editar perfil -->
    <p-dialog [(visible)]="roleVisible" [modal]="true" [style]="{ width: '440px' }" [header]="editing() ? 'Editar perfil' : 'Nuevo perfil'">
      <form [formGroup]="roleForm" class="dialog-form">
        <label>Nombre
          <input pInputText formControlName="name" maxlength="255" placeholder="Ej. Coordinador" />
          <small class="err" *ngIf="showErr('name')">Nombre requerido.</small>
        </label>
        <label>Descripción
          <input pInputText formControlName="description" maxlength="255" placeholder="Opcional" />
        </label>
      </form>
      <ng-template pTemplate="footer">
        <button pButton type="button" label="Cancelar" class="p-button-text" (click)="roleVisible = false"></button>
        <button pButton type="button" label="Guardar" [disabled]="saving()" (click)="saveRole()"></button>
      </ng-template>
    </p-dialog>

    <!-- Asignar permisos -->
    <p-dialog [(visible)]="permVisible" [modal]="true" [style]="{ width: '620px' }" [header]="'Permisos de ' + (permTarget()?.name || '')">
      <div class="permission-dialog">
        <div class="permission-head">
          <span>Permisos del perfil</span>
          <span>{{ permCtrl.value.length }} seleccionados</span>
        </div>

        <div class="permission-list" role="group" aria-label="Permisos del perfil">
          <section class="permission-group" *ngFor="let group of permissionGroups; trackBy: trackPermissionGroup">
            <h3>{{ group.title }}</h3>

            <div class="permission-actions">
              <label
                class="permission-action"
                *ngFor="let action of group.actions; trackBy: trackPermissionAction"
                [class.is-disabled]="!isActionEnabled(action)"
              >
                <input
                  type="checkbox"
                  [disabled]="!isActionEnabled(action)"
                  [checked]="isActionSelected(action)"
                  (change)="togglePermissionAction(action, $any($event.target).checked)"
                />
                <span>{{ action.label }}</span>
              </label>
            </div>
          </section>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <button pButton type="button" label="Cancelar" class="p-button-text" (click)="permVisible = false"></button>
        <button pButton type="button" label="Guardar permisos" [disabled]="saving()" (click)="savePermissions()"></button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .toolbar { display: flex; justify-content: flex-end; margin-bottom: 16px; }
    .loading-wrap { display: flex; justify-content: center; padding: 48px; }
    .actions { display: flex; gap: 6px; }
    .empty-cell { text-align: center; color: var(--text-muted); padding: 24px; }
    .dialog-form { display: flex; flex-direction: column; gap: 14px; padding-top: 8px; }
    .dialog-form label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; color: var(--text); }
    .err { color: var(--badge-expired, #dc2626); font-size: 12px; }
    .permission-dialog { display: flex; flex-direction: column; gap: 12px; padding-top: 8px; }
    .permission-head { display: flex; justify-content: space-between; gap: 12px; color: var(--text); font-size: 13px; font-weight: 600; }
    .permission-head span:last-child { color: var(--text-muted); font-weight: 500; white-space: nowrap; }
    .permission-list { border: 1px solid var(--border); border-radius: 8px; max-height: 380px; overflow-y: auto; background: var(--surface); }
    .permission-group { padding: 14px; border-bottom: 1px solid var(--border); }
    .permission-group:last-child { border-bottom: 0; }
    .permission-group h3 { margin: 0 0 10px; color: var(--text); font-size: 13px; font-weight: 700; }
    .permission-actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(112px, 1fr)); gap: 8px; }
    .permission-action { display: flex; align-items: center; gap: 8px; min-height: 36px; padding: 8px 10px; border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 13px; font-weight: 600; cursor: pointer; background: #fff; }
    .permission-action:hover { background: color-mix(in srgb, var(--primary) 6%, transparent); }
    .permission-action input { width: 16px; height: 16px; flex: 0 0 auto; accent-color: var(--primary); cursor: pointer; }
    .permission-action span { min-width: 0; overflow-wrap: anywhere; }
    .permission-action.is-disabled { color: var(--text-muted); background: #f3f4f6; opacity: .68; cursor: not-allowed; }
    .permission-action.is-disabled input { cursor: not-allowed; }
    .permission-action.is-disabled:hover { background: #f3f4f6; }
  `],
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
