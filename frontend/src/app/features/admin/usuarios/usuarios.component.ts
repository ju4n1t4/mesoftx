import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
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
    TableModule, ButtonModule, DialogModule, InputTextModule, SelectModule,
    MessageModule, ToastModule, ProgressSpinnerModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>
    <div class="content-area">
      <div class="page-header">
        <h1>Usuarios</h1>
        <p>Usuarios del sistema. El administrador crea usuarios y asigna el perfil correspondiente.</p>
      </div>

      <div class="toolbar">
        <button pButton type="button" label="Nuevo usuario" icon="pi pi-plus"
                [disabled]="roles().length === 0" (click)="openCreate()"></button>
      </div>

      <p-message *ngIf="roles().length === 0 && !loading()" severity="warn" styleClass="block">
        <span>No existen perfiles. Crealos primero en "Perfiles y permisos".</span>
      </p-message>

      <div class="loading-wrap" *ngIf="loading()">
        <p-progressSpinner strokeWidth="4" [style]="{ width: '40px', height: '40px' }"></p-progressSpinner>
      </div>

      <p-table *ngIf="!loading()" [value]="users()" styleClass="p-datatable-sm" [rowHover]="true">
        <ng-template pTemplate="header"><tr><th>Documento</th><th>Nombre</th><th>Email</th><th>Perfil</th><th>Estado</th><th style="width:7rem">Acciones</th></tr></ng-template>
        <ng-template pTemplate="body" let-u>
          <tr>
            <td>{{ u.document_number }}</td>
            <td>{{ u.name }}</td>
            <td>{{ u.email || '-' }}</td>
            <td>{{ roleName(u.role_id) }}</td>
            <td>
              <span class="state-switch" [class.is-active]="u.active" [attr.aria-label]="u.active ? 'Activo' : 'Inactivo'">
                <span></span>
              </span>
            </td>
            <td class="actions">
              <button pButton type="button" icon="pi pi-pencil" class="p-button-sm p-button-text" (click)="openEdit(u)"></button>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="6" class="empty-cell">No hay usuarios.</td></tr></ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="dialogVisible" [modal]="true" [style]="{ width: '460px' }" [header]="editing() ? 'Editar usuario' : 'Nuevo usuario'">
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
          <small class="err" *ngIf="showErr('email')">Email valido requerido.</small>
        </label>
        <label>Contrasena
          <input pInputText type="password" formControlName="password" />
          <small class="err" *ngIf="showErr('password')">{{ editing() ? 'Minimo 8 caracteres si deseas cambiarla.' : 'Minimo 8 caracteres.' }}</small>
        </label>
        <label>Perfil
          <p-select
            formControlName="role_id"
            [options]="roleOptions()"
            optionLabel="label"
            optionValue="value"
            placeholder="Selecciona un perfil"
            appendTo="body"
          ></p-select>
          <small class="err" *ngIf="showErr('role_id')">Selecciona un perfil.</small>
        </label>
      </form>
      <ng-template pTemplate="footer">
        <button pButton type="button" label="Cancelar" class="p-button-text" (click)="dialogVisible = false"></button>
        <button pButton type="button" [label]="editing() ? 'Guardar' : 'Crear'" [disabled]="saving()" (click)="save()"></button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .toolbar { display: flex; justify-content: flex-end; margin-bottom: 16px; }
    .block { display: block; margin-bottom: 16px; }
    .loading-wrap { display: flex; justify-content: center; padding: 48px; }
    .actions { display: flex; gap: 6px; }
    .empty-cell { text-align: center; color: var(--text-muted); padding: 24px; }
    .dialog-form { display: flex; flex-direction: column; gap: 14px; padding-top: 8px; }
    .dialog-form label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; color: var(--text); }
    .dialog-form input, .dialog-form p-select { width: 100%; }
    .err { color: var(--badge-expired, #dc2626); font-size: 12px; }
    .state-switch { display: inline-flex; align-items: center; width: 40px; height: 22px; padding: 2px; border-radius: 999px; background: #d1d5db; vertical-align: middle; }
    .state-switch span { width: 18px; height: 18px; border-radius: 999px; background: #fff; box-shadow: 0 1px 2px rgba(15, 23, 42, .18); transition: transform .18s ease; }
    .state-switch.is-active { background: #10b981; }
    .state-switch.is-active span { transform: translateX(18px); }
  `],
})
export class UsuariosComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  editing = signal(false);
  dialogVisible = false;

  users = signal<User[]>([]);
  roles = signal<Role[]>([]);
  roleOptions = computed(() => this.roles().map(r => ({ label: r.name, value: r.id })));
  private editId = signal<number | null>(null);

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
      password: ['', [Validators.minLength(8), Validators.maxLength(128)]],
      role_id: [null, [Validators.required]],
    });
  }

  ngOnInit(): void {
    forkJoin({ users: this.userApi.getUsers(), roles: this.userApi.getRoles() }).subscribe({
      next: ({ users, roles }) => { this.users.set(users ?? []); this.roles.set(roles ?? []); this.loading.set(false); },
      error: e => { this.showError(e); this.loading.set(false); },
    });
  }

  roleName(id: number): string { return this.roles().find(r => r.id === id)?.name ?? '-'; }
  showErr(ctrl: string): boolean { const c = this.form.get(ctrl); return !!c && c.invalid && (c.dirty || c.touched); }

  openCreate(): void {
    this.editing.set(false);
    this.editId.set(null);
    this.form.get('password')?.setValidators([Validators.required, Validators.minLength(8), Validators.maxLength(128)]);
    this.form.get('password')?.updateValueAndValidity();
    this.form.reset({ document_number: '', name: '', email: '', password: '', role_id: null });
    this.dialogVisible = true;
  }

  openEdit(user: User): void {
    this.editing.set(true);
    this.editId.set(user.id);
    this.form.get('password')?.setValidators([Validators.minLength(8), Validators.maxLength(128)]);
    this.form.get('password')?.updateValueAndValidity();
    this.form.reset({
      document_number: user.document_number,
      name: user.name,
      email: user.email ?? '',
      password: '',
      role_id: user.role_id,
    });
    this.dialogVisible = true;
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body: Partial<UserCreate> = {
      document_number: raw.document_number as string,
      name: raw.name as string,
      email: raw.email as string,
      role_id: Number(raw.role_id),
      program_id: null,
    };
    if (raw.password) body.password = raw.password as string;

    const id = this.editId();
    const request = this.editing() && id != null
      ? this.userApi.updateUser(id, body)
      : this.userApi.createUser(body as UserCreate);

    request.subscribe({
      next: () => {
        this.saving.set(false); this.dialogVisible = false;
        this.messageService.add({
          severity: 'success',
          summary: this.editing() ? 'Actualizado' : 'Creado',
          detail: this.editing() ? 'Usuario actualizado.' : 'Usuario creado.',
        });
        this.userApi.getUsers().subscribe({ next: u => this.users.set(u ?? []) });
      },
      error: e => { this.saving.set(false); this.showError(e); },
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
