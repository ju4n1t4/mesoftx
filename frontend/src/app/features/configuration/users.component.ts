import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { UserResponse } from '../../core/models/api.models';
import { RoleRecord, UserMsService, UserPayload } from '../../core/services/user-ms.service';
import { BadgeComponent } from '../../shared/atoms/badge/badge.component';
import { ButtonComponent } from '../../shared/atoms/button/button.component';
import { CardComponent } from '../../shared/atoms/card/card.component';

interface UserDraft {
  id: number;
  name: string;
  surname: string;
  code: string;
  email: string;
  password: string;
  role_id: number;
  career_id: number;
  subject_ids: string;
}

const EMPTY_USER: UserDraft = {
  id: 0,
  name: '',
  surname: '',
  code: '',
  email: '',
  password: '',
  role_id: 1,
  career_id: 1,
  subject_ids: ''
};

@Component({
  selector: 'mx-users',
  standalone: true,
  imports: [CommonModule, FormsModule, BadgeComponent, ButtonComponent, CardComponent],
  template: `
    <section class="page">
      <div class="heading">
        <div>
          <span>Gestion / Usuarios y roles</span>
          <h1>Usuarios</h1>
          <p>Registra, actualiza, habilita e inhabilita usuarios de MESOFTX.</p>
        </div>
        <div class="filters">
          <label>Rol
            <select [(ngModel)]="roleFilter">
              <option [ngValue]="0">Todos</option>
              <option *ngFor="let role of roles()" [ngValue]="role.id">{{ role.name }}</option>
            </select>
          </label>
          <mx-button icon="pi-plus" (clicked)="newUser()">Nuevo usuario</mx-button>
        </div>
      </div>

      <mx-card>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Codigo</th>
                <th>Programa</th>
                <th>Materias</th>
                <th>Rol</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of filteredUsers()">
                <td>
                  <div class="person">
                    <span>{{ initials(user) }}</span>
                    <div>
                      <strong>{{ user.name }} {{ user.surname }}</strong>
                      <small>{{ user.email }}</small>
                    </div>
                  </div>
                </td>
                <td>{{ user.code }}</td>
                <td>{{ programName(user.career_id) }}</td>
                <td>{{ user.subject_ids.length }}</td>
                <td><mx-badge tone="secondary">{{ roleName(user.role_id) }}</mx-badge></td>
                <td><mx-badge [tone]="user.active ? 'success' : 'danger'">{{ user.active ? 'Activo' : 'Inactivo' }}</mx-badge></td>
                <td class="row-actions">
                  <button type="button" (click)="editUser(user)"><i class="pi pi-pencil"></i></button>
                  <button type="button" (click)="toggleUser(user)"><i class="pi pi-power-off"></i></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </mx-card>

      <mx-card>
        <h2>{{ editingId() ? 'Editar usuario' : 'Registrar usuario' }}</h2>
        <form class="form" (ngSubmit)="saveUser()">
          <label>Nombres<input name="name" [(ngModel)]="draft.name" required></label>
          <label>Apellidos<input name="surname" [(ngModel)]="draft.surname" required></label>
          <label>Codigo<input name="code" [(ngModel)]="draft.code" required></label>
          <label>Correo<input name="email" type="email" [(ngModel)]="draft.email" required></label>
          <label>Password<input name="password" type="password" [(ngModel)]="draft.password" [required]="!editingId()"></label>
          <label>Rol
            <select name="role_id" [(ngModel)]="draft.role_id">
              <option *ngFor="let role of roles()" [ngValue]="role.id">{{ role.name }}</option>
            </select>
          </label>
          <label>Programa
            <select name="career_id" [(ngModel)]="draft.career_id">
              <option *ngFor="let career of careers()" [ngValue]="career.id">{{ career.name }}</option>
            </select>
          </label>
          <label>Materias<input name="subject_ids" [(ngModel)]="draft.subject_ids" placeholder="1,2,3"></label>
          <div class="form-actions">
            <mx-button type="submit" icon="pi-save">{{ editingId() ? 'Actualizar' : 'Crear' }}</mx-button>
            <mx-button type="button" variant="ghost" (clicked)="newUser()">Limpiar</mx-button>
          </div>
        </form>
        <p *ngIf="message()" class="message">{{ message() }}</p>
      </mx-card>
    </section>
  `,
  styles: [`
    .page { padding: 28px; }
    .heading { align-items: flex-start; display: flex; justify-content: space-between; margin-bottom: 22px; }
    .heading span { color: var(--mx-muted); font-size: 12px; font-weight: 800; }
    h1 { font-size: 26px; margin: 8px 0 7px; }
    p { color: var(--mx-muted); font-size: 13px; margin: 0; }
    .filters { align-items: end; display: flex; gap: 12px; }
    label { color: #55515e; display: grid; font-size: 12px; font-weight: 800; gap: 7px; }
    input, select { border: 1px solid var(--mx-border); border-radius: 8px; min-height: 40px; padding: 0 11px; }
    .table-wrap { overflow-x: auto; }
    table { border-collapse: collapse; min-width: 860px; width: 100%; }
    th { color: #9a96a1; font-size: 11px; letter-spacing: .08em; padding: 0 12px 12px; text-align: left; text-transform: uppercase; }
    td { border-top: 1px solid var(--mx-border); color: #484450; font-size: 13px; font-weight: 700; padding: 13px 12px; }
    .person { align-items: center; display: flex; gap: 11px; }
    .person > span { align-items: center; background: var(--mx-secondary); border-radius: 999px; color: #fff; display: inline-flex; font-size: 11px; font-weight: 800; height: 34px; justify-content: center; width: 34px; }
    .person strong, .person small { display: block; }
    .person small { color: var(--mx-muted); font-size: 11px; margin-top: 2px; }
    .row-actions { display: flex; gap: 8px; }
    .row-actions button { background: #f7f7f9; border: 1px solid var(--mx-border); border-radius: 8px; cursor: pointer; height: 34px; width: 34px; }
    mx-card + mx-card { display: block; margin-top: 18px; }
    h2 { font-size: 17px; margin: 0 0 16px; }
    .form { display: grid; gap: 14px; grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .form-actions { align-items: end; display: flex; gap: 10px; }
    .message { background: #fff8db; border: 1px solid #fde68a; border-radius: 8px; color: #854d0e; font-weight: 800; margin-top: 14px; padding: 10px 12px; }
    @media (max-width: 980px) { .heading, .filters { align-items: stretch; display: grid; } .form { grid-template-columns: 1fr; } }
  `]
})
export class UsersComponent implements OnInit {
  private readonly userMsService = inject(UserMsService);
  readonly users = signal<UserResponse[]>([]);
  readonly roles = signal<RoleRecord[]>([
    { id: 1, name: 'Administrador' },
    { id: 2, name: 'Coordinador' },
    { id: 3, name: 'Docente' },
    { id: 4, name: 'Evaluador' }
  ]);
  readonly careers = signal([{ id: 1, name: 'Ingenieria de Sistemas' }, { id: 2, name: 'Ingenieria Industrial' }]);
  readonly editingId = signal<number | null>(null);
  readonly message = signal('');
  roleFilter = 0;
  draft: UserDraft = { ...EMPTY_USER };

  ngOnInit(): void {
    this.loadCatalogs();
    this.loadUsers();
  }

  newUser(): void {
    this.editingId.set(null);
    this.draft = { ...EMPTY_USER, role_id: this.roles()[0]?.id ?? 1, career_id: this.careers()[0]?.id ?? 1 };
    this.message.set('');
  }

  editUser(user: UserResponse): void {
    this.editingId.set(user.id);
    this.draft = { ...user, password: '', subject_ids: user.subject_ids.join(',') };
  }

  saveUser(): void {
    const payload = this.toPayload();
    const editingId = this.editingId();
    if (editingId) {
      const updatePayload = { ...payload };
      if (!this.draft.password) {
        delete updatePayload.password;
      }
      this.userMsService.updateUser(editingId, updatePayload).subscribe({
        next: (updated) => this.replaceUser(updated),
        error: () => this.message.set('No fue posible actualizar en User_MS. Revisa token y backend.')
      });
      return;
    }

    this.userMsService.createUser(payload).subscribe({
      next: (created) => this.replaceUser(created),
      error: () => this.message.set('No fue posible crear en User_MS. Revisa token, rol, carrera y materias.')
    });
  }

  toggleUser(user: UserResponse): void {
    const request = user.active ? this.userMsService.deactivateUser(user.id) : this.userMsService.activateUser(user.id);
    request.subscribe({
      next: (updated) => this.replaceUser(updated),
      error: () => this.message.set('No fue posible cambiar el estado del usuario.')
    });
  }

  filteredUsers(): UserResponse[] {
    return this.roleFilter ? this.users().filter((user) => user.role_id === Number(this.roleFilter)) : this.users();
  }

  initials(user: UserResponse): string {
    return `${user.name.charAt(0)}${user.surname.charAt(0)}`.toUpperCase();
  }

  roleName(roleId: number): string {
    return this.roles().find((role) => role.id === roleId)?.name ?? `Rol ${roleId}`;
  }

  programName(careerId: number): string {
    return this.careers().find((career) => career.id === careerId)?.name ?? `Programa ${careerId}`;
  }

  private loadCatalogs(): void {
    this.userMsService.roles().subscribe({ next: (roles) => this.roles.set(roles.length ? roles : this.roles()), error: () => undefined });
    this.userMsService.careers().subscribe({ next: (careers) => this.careers.set(careers.length ? careers : this.careers()), error: () => undefined });
  }

  private loadUsers(): void {
    this.userMsService.users().subscribe({
      next: (users) => this.users.set(users),
      error: () => this.users.set([
        { id: 1, name: 'Juliana', surname: 'Ramirez', code: 'DOC001', email: 'jramirez@unab.edu.co', active: true, role_id: 3, career_id: 1, subject_ids: [1, 2], created_at: null },
        { id: 2, name: 'Oscar', surname: 'Rueda', code: 'COO001', email: 'orueda@unab.edu.co', active: true, role_id: 2, career_id: 1, subject_ids: [3], created_at: null },
        { id: 3, name: 'Daniel', surname: 'Gomez', code: 'DOC002', email: 'dgomez@unab.edu.co', active: false, role_id: 3, career_id: 2, subject_ids: [], created_at: null }
      ])
    });
  }

  private toPayload(): UserPayload {
    return {
      name: this.draft.name,
      surname: this.draft.surname,
      code: this.draft.code,
      email: this.draft.email,
      password: this.draft.password,
      role_id: Number(this.draft.role_id),
      career_id: Number(this.draft.career_id),
      subject_ids: this.draft.subject_ids.split(',').map((id) => Number(id.trim())).filter(Boolean)
    };
  }

  private replaceUser(user: UserResponse): void {
    this.users.update((items) => items.some((item) => item.id === user.id) ? items.map((item) => item.id === user.id ? user : item) : [...items, user]);
    this.newUser();
  }
}
