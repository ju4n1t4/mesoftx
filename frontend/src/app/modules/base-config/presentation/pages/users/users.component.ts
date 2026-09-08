import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { BaseConfigUseCase } from '../../../application/use-cases/base-config.usecase';
import { CareerRecord, RoleRecord, UserPayload, UserRecord } from '../../../domain/models/base-config.models';
import { BadgeComponent } from '../../../../../shared/ui/atoms/badge/badge.component';
import { ButtonComponent } from '../../../../../shared/ui/atoms/button/button.component';
import { CardComponent } from '../../../../../shared/ui/atoms/card/card.component';
import { initialsFromName } from '../../../../../shared/utils/strings';
import { parseNumericList } from '../../../../../shared/utils/strings';

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
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent implements OnInit {
  private readonly baseConfig = inject(BaseConfigUseCase);
  readonly users = signal<UserRecord[]>([]);
  readonly roles = signal<RoleRecord[]>([
    { id: 1, name: 'Administrador' },
    { id: 2, name: 'Coordinador' },
    { id: 3, name: 'Docente' },
    { id: 4, name: 'Evaluador' }
  ]);
  readonly careers = signal<Pick<CareerRecord, 'id' | 'name'>[]>([
    { id: 1, name: 'Ingenieria de Sistemas' },
    { id: 2, name: 'Ingenieria Industrial' }
  ]);
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
    this.draft = {
      ...EMPTY_USER,
      role_id: this.roles()[0]?.id ?? 1,
      career_id: this.careers()[0]?.id ?? 1
    };
    this.message.set('');
  }

  editUser(user: UserRecord): void {
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
      this.baseConfig.gateway.updateUser(editingId, updatePayload).subscribe({
        next: (updated) => this.replaceUser(updated),
        error: () => this.message.set('No fue posible actualizar en User_MS. Revisa token y backend.')
      });
      return;
    }

    this.baseConfig.gateway.createUser(payload).subscribe({
      next: (created) => this.replaceUser(created),
      error: () => this.message.set('No fue posible crear en User_MS. Revisa token, rol, carrera y materias.')
    });
  }

  toggleUser(user: UserRecord): void {
    const request = user.active ? this.baseConfig.gateway.deactivateUser(user.id) : this.baseConfig.gateway.activateUser(user.id);
    request.subscribe({
      next: (updated) => this.replaceUser(updated),
      error: () => this.message.set('No fue posible cambiar el estado del usuario.')
    });
  }

  filteredUsers(): UserRecord[] {
    return this.roleFilter ? this.users().filter((user) => user.role_id === Number(this.roleFilter)) : this.users();
  }

  initials(user: UserRecord): string {
    return initialsFromName(`${user.name} ${user.surname}`);
  }

  roleName(roleId: number): string {
    return this.roles().find((role) => role.id === roleId)?.name ?? `Rol ${roleId}`;
  }

  programName(careerId: number): string {
    return this.careers().find((career) => career.id === careerId)?.name ?? `Programa ${careerId}`;
  }

  private loadCatalogs(): void {
    this.baseConfig.gateway.roles().subscribe({
      next: (roles) => this.roles.set(roles.length ? roles : this.roles()),
      error: () => undefined
    });
    this.baseConfig.gateway.careers().subscribe({
      next: (careers) => this.careers.set(careers.length ? careers : this.careers()),
      error: () => undefined
    });
  }

  private loadUsers(): void {
    this.baseConfig.gateway.users().subscribe({
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
      subject_ids: parseNumericList(this.draft.subject_ids)
    };
  }

  private replaceUser(user: UserRecord): void {
    this.users.update((items) => items.some((item) => item.id === user.id) ? items.map((item) => item.id === user.id ? user : item) : [...items, user]);
    this.newUser();
  }
}
