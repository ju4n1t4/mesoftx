import { InputAtom } from '../../../../../../shared/ui/atoms/input/input.directive';
import { ButtonAtom } from '../../../../../../shared/ui/atoms/button/button.directive';
﻿import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { UserGateway as UserApiService } from '../../../../application/ports/user-api.service.port';
import { User, Role, Program, UserCreate } from '../../../../domain/models/abet.models';
import { BulkExcelService, BulkImportSummary } from '../../../../../../shared/services/bulk-excel.service';
import { BulkResultDialogComponent } from '../../../../../../shared/ui/organisms/bulk-result-dialog/bulk-result-dialog.component';

/** Datos del formulario de alta de profesor (modelo v13). */
interface ProfesorForm {
  name: string; document_number: string; email: string; password: string;
  role_id: number; program_id: string; active: boolean;
}

@Component({
  selector: 'app-profesores',
  standalone: true,
  imports: [InputAtom, ButtonAtom, CommonModule, FormsModule, BulkResultDialogComponent],
  templateUrl: './profesores.component.html',
  styleUrl: './profesores.component.scss'
})
export class ProfesoresComponent implements OnInit {
  loading = signal(true);
  error   = signal('');
  search  = '';
  users   = signal<User[]>([]);
  roles   = signal<Role[]>([]);
  programs = signal<Program[]>([]);

  showForm  = signal(false);
  editing   = signal(false);
  editId    = signal<number | null>(null);
  saving    = signal(false);
  formError = signal('');
  bulkVisible = false;
  bulkSummary: BulkImportSummary = { success: [], skipped: [], errors: [] };
  form: ProfesorForm = this.emptyForm();

  constructor(
    private userApi: UserApiService,
    private bulkExcel: BulkExcelService,
  ) {}

  ngOnInit() {
    // Carga best-effort: los endpoints de User_MS requieren JWT, por lo que en
    // modo demo pueden fallar. Cada llamada se resuelve por separado para que
    // un fallo parcial no bloquee toda la vista.
    let pending = 3;
    const done = () => { if (--pending === 0) this.loading.set(false); };

    this.userApi.getUsers().subscribe({
      next: (u) => { this.users.set(u ?? []); done(); },
      error: () => { this.showConnHint(); done(); },
    });
    this.userApi.getRoles().subscribe({
      next: (r) => { this.roles.set(r ?? []); done(); },
      error: () => { this.showConnHint(); done(); },
    });
    this.userApi.getPrograms().subscribe({
      next: (c) => { this.programs.set(c ?? []); done(); },
      error: () => { this.showConnHint(); done(); },
    });
  }

  private showConnHint() {
    this.error.set('Algunos catálogos requieren una sesión autenticada. Inicia sesión con tus credenciales para ver y gestionar usuarios.');
  }

  private emptyForm(): ProfesorForm {
    return { name: '', document_number: '', email: '', password: '', role_id: 0, program_id: '', active: true };
  }

  downloadTemplate(): void {
    this.bulkExcel.downloadTemplate(
      'plantilla_profesores.xlsx',
      ['document_number', 'name', 'email', 'password', 'program_id', 'active'],
      'Profesores',
    );
  }

  async onBulkFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const summary: BulkImportSummary = { success: [], skipped: [], errors: [] };
    const role = this.roles().find(r => this.isTeacherRole(r));
    if (!role) {
      summary.errors.push({ row: 0, label: file.name, detail: 'No existe un rol Profesor configurado.' });
      this.bulkSummary = summary;
      this.bulkVisible = true;
      return;
    }

    try {
      const rows = await this.bulkExcel.readRows(file);
      const activePrograms = new Map(this.programs().filter(p => p.active).map(p => [p.id.toUpperCase(), p]));
      const existingDocs = new Set(this.users().map(u => String(u.document_number).trim()));
      const existingEmails = new Set(this.users().map(u => String(u.email ?? '').trim().toLowerCase()).filter(Boolean));
      const seenDocs = new Set<string>();
      const seenEmails = new Set<string>();

      for (let index = 0; index < rows.length; index++) {
        const rowNumber = index + 2;
        const documentNumber = this.bulkExcel.value(rows[index], 'document_number');
        const name = this.bulkExcel.value(rows[index], 'name');
        const email = this.bulkExcel.value(rows[index], 'email').toLowerCase();
        const password = this.bulkExcel.value(rows[index], 'password');
        const programId = this.bulkExcel.value(rows[index], 'program_id').toUpperCase();
        const active = this.bulkExcel.boolValue(rows[index], 'active', true);
        const label = documentNumber || `Fila ${rowNumber}`;

        if (!documentNumber) {
          summary.errors.push({ row: rowNumber, label, detail: 'El documento es requerido.' });
          continue;
        }
        if (!name || name.length > 255) {
          summary.errors.push({ row: rowNumber, label, detail: 'El nombre es requerido y debe tener máximo 255 caracteres.' });
          continue;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          summary.errors.push({ row: rowNumber, label, detail: 'El correo no tiene un formato válido.' });
          continue;
        }
        if (password.length < 10) {
          summary.errors.push({ row: rowNumber, label, detail: 'La contraseña debe tener al menos 10 caracteres.' });
          continue;
        }
        if (!activePrograms.has(programId)) {
          summary.errors.push({ row: rowNumber, label, detail: 'El programa indicado no existe o está inactivo.' });
          continue;
        }
        if (existingDocs.has(documentNumber) || existingEmails.has(email)) {
          summary.skipped.push({ row: rowNumber, label, detail: 'Ya existe un usuario con ese documento o correo.' });
          continue;
        }
        if (seenDocs.has(documentNumber) || seenEmails.has(email)) {
          summary.skipped.push({ row: rowNumber, label, detail: 'Registro repetido dentro del archivo.' });
          continue;
        }

        seenDocs.add(documentNumber);
        seenEmails.add(email);
        try {
          const saved = await firstValueFrom(this.userApi.createUser({
            document_number: documentNumber,
            name,
            email,
            password,
            role_id: role.id,
            program_id: programId,
            active,
          } as UserCreate));
          this.users.set([...this.users(), saved]);
          existingDocs.add(documentNumber);
          existingEmails.add(email);
          summary.success.push({ row: rowNumber, label: documentNumber, detail: name });
        } catch (err) {
          summary.errors.push({ row: rowNumber, label: documentNumber, detail: this.errorText(err) });
        }
      }
    } catch (err) {
      summary.errors.push({ row: 0, label: file.name, detail: this.errorText(err) });
    }

    this.bulkSummary = summary;
    this.bulkVisible = true;
  }

  openForm() {
    this.form = this.emptyForm();
    this.editing.set(false);
    this.editId.set(null);
    const profesor = this.roles().find(r => this.isTeacherRole(r));
    if (!profesor) {
      this.formError.set('No existe un rol de profesor en el sistema. Pide al administrador que lo cree antes de registrar profesores.');
      this.showForm.set(false);
      return;
    }
    this.form.role_id = profesor.id;
    this.formError.set('');
    this.showForm.set(true);
  }

  openEdit(user: User) {
    this.editing.set(true);
    this.editId.set(user.id);
    this.form = {
      name: user.name,
      document_number: user.document_number,
      email: user.email ?? '',
      password: '',
      role_id: user.role_id,
      program_id: user.program_id ?? '',
      active: user.active,
    };
    this.formError.set('');
    this.showForm.set(true);
  }

  closeForm() { this.showForm.set(false); }

  save() {
    if (!this.form.name || !this.form.email || !this.form.document_number) {
      this.formError.set('Completa nombre, documento y correo.');
      return;
    }
    if (!this.form.role_id) { this.formError.set('Selecciona un rol.'); return; }
    if (!this.form.program_id) { this.formError.set('Selecciona el programa académico del profesor.'); return; }
    if (!this.editing() && this.form.password.length < 10) { this.formError.set('La contraseña debe tener al menos 10 caracteres.'); return; }
    if (this.editing() && this.form.password && this.form.password.length < 10) { this.formError.set('La contraseña debe tener al menos 10 caracteres.'); return; }

    this.saving.set(true);
    this.formError.set('');
    const payload: Partial<UserCreate> & { active?: boolean } = {
      document_number: this.form.document_number,
      name: this.form.name,
      email: this.form.email,
      role_id: this.form.role_id,
      program_id: this.form.program_id,
      active: this.form.active,
    };
    if (this.form.password) payload.password = this.form.password;

    const id = this.editId();
    const request = this.editing() && id != null
      ? this.userApi.updateUser(id, payload)
      : this.userApi.createUser(payload as UserCreate);

    request.subscribe({
      next: (saved) => {
        this.users.set(this.editing()
          ? this.users().map(u => u.id === saved.id ? saved : u)
          : [...this.users(), saved]);
        this.saving.set(false);
        this.showForm.set(false);
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(err?.error?.detail ?? 'No se pudo guardar el profesor. Revisa los datos e inténtalo de nuevo.');
      },
    });
  }
  filtered() {
    const q = this.search.toLowerCase().trim();
    const teachers = this.users().filter(u => this.isTeacherRoleId(u.role_id));
    if (!q) return teachers;
    return teachers.filter(u =>
      u.name.toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q)
    );
  }

  initials(u: User) { return (u.name?.[0] ?? '').toUpperCase(); }
  roleName(id: number) { return this.roles().find(r => r.id === id)?.name ?? '-'; }
  programName(id: string | null) { return this.programs().find(c => c.id === id)?.name ?? '-'; }

  private isTeacherRole(role: Role): boolean {
    return role.name.trim().toLowerCase().startsWith('profesor');
  }

  private isTeacherRoleId(roleId: number): boolean {
    const role = this.roles().find(r => r.id === roleId);
    return role ? this.isTeacherRole(role) : false;
  }

  private errorText(err: unknown): string {
    const http = err as { status?: number; error?: { detail?: unknown } };
    if (http?.status === 503) return 'Servicio no disponible, intenta en unos segundos';
    if (http?.status === 404) return 'No encontrado';
    return typeof http?.error?.detail === 'string' ? http.error.detail : 'Ocurrió un error inesperado';
  }
}
