import { InputAtom } from '../../../../../../shared/ui/atoms/input/input.directive';
import { ButtonAtom } from '../../../../../../shared/ui/atoms/button/button.directive';
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

import { UserGateway as UserApiService } from '../../../../application/ports/user-api.service.port';
import { User, Role, UserCreate } from '../../../../domain/models/abet.models';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [InputAtom, ButtonAtom, 
    CommonModule, ReactiveFormsModule,
    TableModule, ButtonModule, DialogModule, InputTextModule, SelectModule,
    MessageModule, ToastModule, ProgressSpinnerModule,
  ],
  providers: [MessageService],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.scss',
})
export class UsuariosComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  editing = signal(false);
  dialogVisible = false;

  users = signal<User[]>([]);
  roles = signal<Role[]>([]);
  roleOptions = computed(() => this.roles().filter(r => r.name === 'Coordinador').map(r => ({ label: r.name, value: r.id })));
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
      password: ['', [Validators.minLength(10), Validators.maxLength(128)]],
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
    this.form.get('password')?.setValidators([Validators.required, Validators.minLength(10), Validators.maxLength(128)]);
    this.form.get('password')?.updateValueAndValidity();
    this.form.reset({ document_number: '', name: '', email: '', password: '', role_id: null });
    this.dialogVisible = true;
  }

  openEdit(user: User): void {
    this.editing.set(true);
    this.editId.set(user.id);
    this.form.get('password')?.setValidators([Validators.minLength(10), Validators.maxLength(128)]);
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
