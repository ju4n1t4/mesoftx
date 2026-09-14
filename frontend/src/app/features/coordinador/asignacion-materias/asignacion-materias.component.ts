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

import { UserApiService } from '../../../core/services/user-api.service';
import { User, Subject, TeacherSubjectDetail } from '../../../core/models/abet.models';

@Component({
  selector: 'app-asignacion-materias',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    TableModule, ButtonModule, MultiSelectModule, ToastModule, ProgressSpinnerModule, ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast></p-toast>
    <p-confirmDialog></p-confirmDialog>

    <div class="content-area">
      <div class="page-header">
        <h1>Asignar NRC a profesores</h1>
        <p>Define qué materias (NRC) dicta cada profesor. Un mismo NRC puede asignarse a varios profesores.</p>
      </div>

      <div class="loading-wrap" *ngIf="loading()">
        <p-progressSpinner strokeWidth="4" [style]="{ width: '40px', height: '40px' }"></p-progressSpinner>
      </div>

      <div class="asg-layout" *ngIf="!loading()">
        <!-- Panel izquierdo: profesores -->
        <div class="teacher-panel">
          <div class="tp-label">PROFESORES</div>
          <div class="empty-inline" *ngIf="teachers().length === 0">
            No hay profesores registrados. Créalos primero desde la gestión de usuarios.
          </div>
          <button *ngFor="let t of teachers()"
                  class="teacher-item"
                  [class.active]="selected()?.id === t.id"
                  (click)="select(t)">
            <span class="ti-av">{{ (t.name[0] || 'P').toUpperCase() }}</span>
            <div class="ti-info">
              <span class="ti-name">{{ t.name }}</span>
              <span class="ti-doc">{{ t.document_number }}</span>
            </div>
          </button>
        </div>

        <!-- Panel derecho: NRC del profesor + añadir -->
        <div class="detail-panel">
          <div class="empty-detail" *ngIf="!selected()">
            <i class="pi pi-arrow-left"></i> Selecciona un profesor
          </div>

          <ng-container *ngIf="selected() as t">
            <div class="dp-head">
              <div class="dp-title">Materias de {{ t.name }}</div>
            </div>

            <div class="add-row">
              <p-multiSelect
                [options]="addableOptions()"
                [formControl]="toAdd"
                optionLabel="label" optionValue="value"
                placeholder="Selecciona materias para asignar"
                display="chip" styleClass="add-ms">
              </p-multiSelect>
              <button pButton type="button" label="Asignar" icon="pi pi-plus"
                      [disabled]="toAdd.value.length === 0 || busy()"
                      (click)="assign(t.id)"></button>
            </div>

            <p-table [value]="assignments()" styleClass="p-datatable-sm" [rowHover]="true">
              <ng-template pTemplate="header">
                <tr><th>NRC</th><th>Código</th><th>Nombre</th><th style="width:6rem">Quitar</th></tr>
              </ng-template>
              <ng-template pTemplate="body" let-a>
                <tr>
                  <td>{{ a.subjects_id }}</td>
                  <td>{{ a.materia_curso }}</td>
                  <td>{{ a.name }}</td>
                  <td>
                    <button pButton type="button" icon="pi pi-trash" class="p-button-text p-button-danger p-button-sm"
                            [disabled]="busy()" (click)="confirmRemove(a)"></button>
                  </td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr><td colspan="4" class="empty-cell">Este profesor no tiene materias asignadas.</td></tr>
              </ng-template>
            </p-table>
          </ng-container>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .loading-wrap { display: flex; justify-content: center; padding: 48px; }
    .asg-layout { display: grid; grid-template-columns: 300px 1fr; gap: 16px; align-items: start; }
    .teacher-panel { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 12px; display: flex; flex-direction: column; gap: 6px; }
    .tp-label { font-size: 10px; font-weight: 700; color: var(--text-muted); letter-spacing: .08em; padding: 6px 8px; }
    .teacher-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid transparent; border-radius: var(--radius-sm); background: none; cursor: pointer; font-family: inherit; text-align: left; width: 100%; }
    .teacher-item:hover { background: var(--surface-2); }
    .teacher-item.active { background: rgba(124,58,237,0.06); border-color: rgba(124,58,237,0.3); }
    .ti-av { width: 32px; height: 32px; border-radius: 50%; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; }
    .ti-info { display: flex; flex-direction: column; }
    .ti-name { font-size: 14px; font-weight: 700; color: var(--text); }
    .ti-doc { font-size: 11px; color: var(--text-muted); }
    .detail-panel { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 18px 20px; min-height: 200px; }
    .empty-detail { color: var(--text-muted); font-size: 14px; display: flex; align-items: center; gap: 8px; justify-content: center; padding: 48px; }
    .dp-head { margin-bottom: 14px; }
    .dp-title { font-size: 15px; font-weight: 800; color: var(--text); }
    .add-row { display: flex; gap: 10px; margin-bottom: 16px; }
    .add-ms { flex: 1; }
    .empty-inline { font-size: 13px; color: var(--text-muted); padding: 12px 8px; }
    .empty-cell { text-align: center; color: var(--text-muted); padding: 20px; }
  `],
})
export class AsignacionMateriasComponent implements OnInit {
  loading = signal(true);
  busy = signal(false);

  private users = signal<User[]>([]);
  private profesorRoleId = signal<number | null>(null);
  private allSubjects = signal<Subject[]>([]);
  private assignmentsSig = signal<TeacherSubjectDetail[]>([]);
  private selectedSig = signal<User | null>(null);

  toAdd = new FormControl<number[]>([], { nonNullable: true });

  teachers = computed(() => {
    const rid = this.profesorRoleId();
    return rid == null ? [] : this.users().filter(u => u.role_id === rid);
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
        this.profesorRoleId.set(roles?.find(r => r.name === 'Profesor')?.id ?? null);
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
}
