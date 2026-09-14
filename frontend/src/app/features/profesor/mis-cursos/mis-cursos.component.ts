import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';

import { UserApiService } from '../../../core/services/user-api.service';
import { Subject } from '../../../core/models/abet.models';

interface CourseRow extends Subject {
  studentCount: number;
}

@Component({
  selector: 'app-mis-cursos',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    TableModule, ButtonModule, TagModule, MessageModule, ToastModule, ProgressSpinnerModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>
    <div class="content-area">
      <div class="page-header">
        <h1>Mis cursos</h1>
        <p>Los cursos que te asignó el coordinador y lo que te falta por hacer.</p>
      </div>

      <div class="loading-wrap" *ngIf="loading()">
        <p-progressSpinner strokeWidth="4" [style]="{ width: '40px', height: '40px' }"></p-progressSpinner>
      </div>

      <ng-container *ngIf="!loading()">
        <!-- Banner de NRC pendientes de cargar estudiantes -->
        <p-message *ngIf="pending().length > 0" severity="warn" styleClass="pending-banner">
          <span>
            Te faltan por cargar los estudiantes de {{ pending().length }} curso(s):
            <a *ngFor="let p of pending(); let last = last" [routerLink]="['/profesor/estudiantes', p.nrc]" class="pending-link">
              {{ p.materia_curso }} ({{ p.nrc }}){{ last ? '' : ', ' }}
            </a>
          </span>
        </p-message>

        <!-- Estado vacío: sin cursos asignados -->
        <div class="empty-box" *ngIf="courses().length === 0">
          <div class="empty-icon"><i class="pi pi-book"></i></div>
          <div class="empty-title">Aún no tienes cursos asignados</div>
          <div class="empty-desc">Contacta al coordinador para que te asigne materias (NRC).</div>
        </div>

        <p-table *ngIf="courses().length > 0" [value]="courses()" styleClass="p-datatable-sm" [rowHover]="true">
          <ng-template pTemplate="header">
            <tr><th>NRC</th><th>Código</th><th>Nombre</th><th>Periodo</th><th>Estudiantes</th><th style="width:16rem">Acciones</th></tr>
          </ng-template>
          <ng-template pTemplate="body" let-c>
            <tr>
              <td>{{ c.nrc }}</td>
              <td>{{ c.materia_curso }}</td>
              <td>{{ c.name }}</td>
              <td>{{ c.periods_id }}</td>
              <td>
                <span *ngIf="c.studentCount > 0">{{ c.studentCount }}</span>
                <p-tag *ngIf="c.studentCount === 0" severity="warn" value="Sin estudiantes"></p-tag>
              </td>
              <td class="actions">
                <button pButton type="button" label="Cargar estudiantes" icon="pi pi-upload" class="p-button-sm p-button-secondary"
                        [routerLink]="['/profesor/estudiantes', c.nrc]"></button>
                <button pButton type="button" label="Valorar" icon="pi pi-check-square" class="p-button-sm"
                        routerLink="/profesor/valorar"></button>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </ng-container>
    </div>
  `,
  styles: [`
    .loading-wrap { display: flex; justify-content: center; padding: 48px; }
    .pending-banner { display: block; margin-bottom: 16px; }
    .pending-link { color: var(--primary); font-weight: 600; cursor: pointer; }
    .actions { display: flex; gap: 6px; flex-wrap: wrap; }
    .empty-box { background: #fff; border: 1px dashed var(--border); border-radius: var(--radius-md); padding: 48px 24px; text-align: center; }
    .empty-icon { width: 56px; height: 56px; border-radius: 50%; margin: 0 auto 14px; background: var(--surface-2); color: var(--text-muted); display: flex; align-items: center; justify-content: center; font-size: 24px; }
    .empty-title { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
    .empty-desc { font-size: 13px; color: var(--text-muted); }
  `],
})
export class MisCursosComponent implements OnInit {
  loading = signal(true);
  courses = signal<CourseRow[]>([]);
  pending = signal<Subject[]>([]);

  constructor(private userApi: UserApiService, private messageService: MessageService) {}

  ngOnInit(): void {
    forkJoin({
      subjects: this.userApi.getMySubjects(),
      pending: this.userApi.getMyPendingSubjects(),
    }).subscribe({
      next: ({ subjects, pending }) => {
        this.pending.set(pending ?? []);
        const list = subjects ?? [];
        if (list.length === 0) { this.courses.set([]); this.loading.set(false); return; }
        // Conteo de estudiantes por curso (una llamada por NRC; listas cortas).
        forkJoin(list.map(s => this.userApi.getSubjectStudents(s.nrc))).subscribe({
          next: studentLists => {
            this.courses.set(list.map((s, i) => ({ ...s, studentCount: (studentLists[i] ?? []).length })));
            this.loading.set(false);
          },
          error: () => { this.courses.set(list.map(s => ({ ...s, studentCount: 0 }))); this.loading.set(false); },
        });
      },
      error: e => { this.showError(e); this.loading.set(false); },
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
