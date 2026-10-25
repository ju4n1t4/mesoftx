import { ButtonAtom } from '../../../../../../shared/ui/atoms/button/button.directive';
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

import { UserGateway as UserApiService } from '../../../../application/ports/user-api.service.port';
import { Subject } from '../../../../domain/models/abet.models';

interface CourseRow extends Subject {
  studentCount: number;
}

@Component({
  selector: 'app-mis-cursos',
  standalone: true,
  imports: [ButtonAtom, 
    CommonModule, RouterLink,
    TableModule, ButtonModule, TagModule, MessageModule, ToastModule, ProgressSpinnerModule,
  ],
  providers: [MessageService],
  templateUrl: './mis-cursos.component.html',
  styleUrl: './mis-cursos.component.scss',
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
