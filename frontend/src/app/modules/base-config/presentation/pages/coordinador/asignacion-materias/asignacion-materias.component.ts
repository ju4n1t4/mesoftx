import { ButtonAtom } from '../../../../../../shared/ui/atoms/button/button.directive';
import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

import { UserGateway as UserApiService } from '../../../../application/ports/user-api.service.port';
import { User, Subject, TeacherSubjectDetail, Role } from '../../../../domain/models/abet.models';

@Component({
  selector: 'app-asignacion-materias',
  standalone: true,
  imports: [ButtonAtom, 
    CommonModule, ReactiveFormsModule,
    TableModule, ButtonModule, MultiSelectModule, ToastModule, ProgressSpinnerModule, ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './asignacion-materias.component.html',
  styleUrl: './asignacion-materias.component.scss',
})
export class AsignacionMateriasComponent implements OnInit {
  loading = signal(true);
  busy = signal(false);

  private users = signal<User[]>([]);
  private profesorRoleIds = signal<Set<number>>(new Set());
  private allSubjects = signal<Subject[]>([]);
  private assignmentsSig = signal<TeacherSubjectDetail[]>([]);
  private selectedSig = signal<User | null>(null);

  toAdd = new FormControl<number[]>([], { nonNullable: true });

  teachers = computed(() => {
    const roleIds = this.profesorRoleIds();
    return this.users().filter(u => u.active && roleIds.has(u.role_id));
  });
  selected = computed(() => this.selectedSig());
  assignments = computed(() => this.assignmentsSig());

  // Materias que aún no tiene el profesor seleccionado.
  addableOptions = computed(() => {
    const assigned = new Set(this.assignmentsSig().map(a => a.subjects_id));
    return this.allSubjects()
      .filter(s => !assigned.has(s.nrc))
      .map(s => ({ label: `${s.nrc} · ${s.materia_curso} — ${s.name}`, value: s.nrc }));
  });

  constructor(
    private userApi: UserApiService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {}

  ngOnInit(): void {
    forkJoin({
      users: this.userApi.getUsers(),
      roles: this.userApi.getRoles(),
      subjects: this.userApi.getSubjects(),
    }).subscribe({
      next: ({ users, roles, subjects }) => {
        this.users.set(users ?? []);
        this.allSubjects.set(subjects ?? []);
        this.profesorRoleIds.set(new Set((roles ?? []).filter(r => this.isTeacherRole(r)).map(r => r.id)));
        this.loading.set(false);
      },
      error: e => { this.showError(e); this.loading.set(false); },
    });
  }

  select(t: User): void {
    this.selectedSig.set(t);
    this.toAdd.reset([]);
    this.loadAssignments(t.id);
  }

  private loadAssignments(userId: number): void {
    this.userApi.getTeacherSubjects(userId).subscribe({
      next: a => this.assignmentsSig.set(a ?? []),
      error: e => this.showError(e),
    });
  }

  assign(userId: number): void {
    const nrcs = this.toAdd.value ?? [];
    if (nrcs.length === 0) return;
    this.busy.set(true);
    let pending = nrcs.length;
    const done = () => {
      if (--pending === 0) {
        this.busy.set(false);
        this.toAdd.reset([]);
        this.loadAssignments(userId);
      }
    };
    for (const nrc of nrcs) {
      this.userApi.assignTeacherSubject({ user_id: userId, subjects_id: nrc }).subscribe({
        next: () => { this.messageService.add({ severity: 'success', summary: 'Asignada', detail: `NRC ${nrc} asignado.` }); done(); },
        error: e => { this.showError(e); done(); },
      });
    }
  }

  confirmRemove(a: TeacherSubjectDetail): void {
    this.confirmationService.confirm({
      header: 'Quitar asignación',
      message: `¿Quitar la materia ${a.materia_curso} (NRC ${a.subjects_id})? El profesor perderá acceso a ese curso.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Quitar', rejectLabel: 'Cancelar',
      accept: () => this.remove(a),
    });
  }

  private remove(a: TeacherSubjectDetail): void {
    this.busy.set(true);
    this.userApi.deleteTeacherSubject(a.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.messageService.add({ severity: 'success', summary: 'Quitada', detail: `NRC ${a.subjects_id} quitado.` });
        this.loadAssignments(a.user_id);
      },
      error: e => { this.busy.set(false); this.showError(e); },
    });
  }

  private showError(err: HttpErrorResponse): void {
    let detail: string;
    if (err.status === 503) detail = 'Servicio no disponible, intenta en unos segundos';
    else if (err.status === 404) detail = 'No encontrado';
    else detail = typeof err.error?.detail === 'string' ? err.error.detail : 'Ocurrió un error inesperado';
    this.messageService.add({ severity: 'error', summary: `Error ${err.status}`, detail });
  }

  private isTeacherRole(role: Role): boolean {
    return role.name.trim().toLowerCase().startsWith('profesor');
  }
}
