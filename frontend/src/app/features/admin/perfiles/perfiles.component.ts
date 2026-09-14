import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

import { UserApiService } from '../../../core/services/user-api.service';
import { Role, Permission } from '../../../core/models/abet.models';

@Component({
  selector: 'app-perfiles',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    TableModule, ButtonModule, DialogModule, InputTextModule, MultiSelectModule,
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
    <p-dialog [(visible)]="permVisible" [modal]="true" [style]="{ width: '520px' }" [header]="'Permisos de ' + (permTarget()?.name || '')">
      <div class="dialog-form">
        <label>Permisos del perfil
          <p-multiSelect [options]="permOptions()" [formControl]="permCtrl" optionLabel="label" optionValue="value" display="chip" placeholder="Selecciona permisos"></p-multiSelect>
        </label>
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
  private permissions = signal<Permission[]>([]);
  private editId = signal<number | null>(null);
  private permTargetSig = signal<Role | null>(null);

  roleForm: FormGroup;
  permCtrl = new FormControl<string[]>([], { nonNullable: true });

  permOptions = computed(() => this.permissions().map(p => ({ label: `${p.code} — ${p.name}`, value: p.code })));
  permTarget = computed(() => this.permTargetSig());

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
