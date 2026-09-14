import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';

import { UserApiService } from '../../../core/services/user-api.service';
import { User, Role, UserCreate } from '../../../core/models/abet.models';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    TableModule, ButtonModule, DialogModule, InputTextModule, MessageModule, ToastModule, ProgressSpinnerModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>
    <div class="content-area">
      <div class="page-header">
        <h1>Usuarios</h1>
        <p>Usuarios del sistema. El administrador crea el usuario Coordinador; el resto los crea el coordinador.</p>
      </div>

      <div class="toolbar">
        <button pButton type="button" label="Nuevo coordinador" icon="pi pi-plus"
                [disabled]="coordinadorRoleId() == null" (click)="openCreate()"></button>
      </div>

      <p-message *ngIf="coordinadorRoleId() == null && !loading()" severity="warn" styleClass="block">
        <span>No existe el perfil "Coordinador". Créalo primero en "Perfiles y permisos".</span>
      </p-message>

      <div class="loading-wrap" *ngIf="loading()">
        <p-progressSpinner strokeWidth="4" [style]="{ width: '40px', height: '40px' }"></p-progressSpinner>
      </div>

      <p-table *ngIf="!loading()" [value]="users()" styleClass="p-datatable-sm" [rowHover]="true">
        <ng-template pTemplate="header"><tr><th>Documento</th><th>Nombre</th><th>Email</th><th>Perfil</th><th>Activo</th></tr></ng-template>
        <ng-template pTemplate="body" let-u>
          <tr>
            <td>{{ u.document_number }}</td>
            <td>{{ u.name }}</td>
            <td>{{ u.email || '—' }}</td>
            <td>{{ roleName(u.role_id) }}</td>
            <td>{{ u.active ? 'Sí' : 'No' }}</td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="5" class="empty-cell">No hay usuarios.</td></tr></ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="dialogVisible" [modal]="true" [style]="{ width: '460px' }" header="Nuevo usuario Coordinador">
      <form [formGroup]="form" class="dialog-form">
        <label>Documento
          <input pInputText formControlName="document_number" maxlength="25" />
          <small class="err" *ngIf="showErr('document_number')">Requerido.</small>
        </label>
        <label>Nombre
          <input pInputText formControlName="name" maxlength="255" />
          <small class="err" *ngIf="showErr('name')">Requerido.</small>
        </label>
        <label>Email
          <input pInputText formControlName="email" maxlength="255" />
          <small class="err" *ngIf="showErr('email')">Email válido requerido.</small>
        </label>
        <label>Contraseña
          <input pInputText type="password" formControlName="password" />
          <small class="err" *ngIf="showErr('password')">Mínimo 8 caracteres.</small>
        </label>
        <small class="muted">El perfil será "Coordinador".</small>
      </form>
      <ng-template pTemplate="footer">
        <button pButton type="button" label="Cancelar" class="p-button-text" (click)="dialogVisible = false"></button>
        <button pButton type="button" label="Crear" [disabled]="saving()" (click)="save()"></button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .toolbar { display: flex; justify-content: flex-end; margin-bottom: 16px; }
    .block { display: block; margin-bottom: 16px; }
    .loading-wrap { display: flex; justify-content: center; padding: 48px; }
    .empty-cell { text-align: center; color: var(--text-muted); padding: 24px; }
    .dialog-form { display: flex; flex-direction: column; gap: 14px; padding-top: 8px; }
    .dialog-form label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; color: var(--text); }
    .dialog-form input { width: 100%; }
    .err { color: var(--badge-expired, #dc2626); font-size: 12px; }
    .muted { color: var(--text-muted); font-weight: 400; }
  `],
})
export class UsuariosComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  dialogVisible = false;

  users = signal<User[]>([]);
  private roles = signal<Role[]>([]);
  coordinadorRoleId = computed(() => this.roles().find(r => r.name === 'Coordinador')?.id ?? null);

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private userApi: UserApiService,
    private messageService: MessageService,
  ) {
    this.form = this.fb.group({
      document_number: ['', [Validators.required, Validators.maxLength(25)]],
      name: ['', [Validators.required, Validators.maxLength(255)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
    });
  }

  ngOnInit(): void {
    forkJoin({ users: this.userApi.getUsers(), roles: this.userApi.getRoles() }).subscribe({
      next: ({ users, roles }) => { this.users.set(users ?? []); this.roles.set(roles ?? []); this.loading.set(false); },
      error: e => { this.showError(e); this.loading.set(false); },
    });
  }

  roleName(id: number): string { return this.roles().find(r => r.id === id)?.name ?? '—'; }
  showErr(ctrl: string): boolean { const c = this.form.get(ctrl); return !!c && c.invalid && (c.dirty || c.touched); }

  openCreate(): void { this.form.reset({ document_number: '', name: '', email: '', password: '' }); this.dialogVisible = true; }

  save(): void {
    const roleId = this.coordinadorRoleId();
    if (roleId == null) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body: UserCreate = {
      document_number: raw.document_number as string,
      name: raw.name as string,
      email: raw.email as string,
      password: raw.password as string,
      role_id: roleId,
      program_id: null,
    };
    this.userApi.createUser(body).subscribe({
      next: () => {
        this.saving.set(false); this.dialogVisible = false;
        this.messageService.add({ severity: 'success', summary: 'Creado', detail: 'Coordinador creado.' });
        this.userApi.getUsers().subscribe({ next: u => this.users.set(u ?? []) });
      },
      error: e => { this.saving.set(false); this.showError(e); },   // 403/422 -> detail
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
