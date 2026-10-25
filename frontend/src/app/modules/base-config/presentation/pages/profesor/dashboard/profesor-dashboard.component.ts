import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AssesmentGateway as AssesmentApiService } from '../../../../application/ports/assesment-api.service.port';
import { UserGateway as UserApiService } from '../../../../application/ports/user-api.service.port';
import { StudentOutcome, Subject } from '../../../../domain/models/abet.models';

@Component({
  selector: 'app-profesor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profesor-dashboard.component.html',
  styleUrl: './profesor-dashboard.component.scss'
})
export class ProfesorDashboardComponent implements OnInit {
  loading = signal(true);
  error   = signal<string | null>(null);
  outcomes = signal<StudentOutcome[]>([]);
  courses  = signal<{ code: string; name: string }[]>([]);
  rubricsCount = signal(0);
  studentsCount = signal(0);

  constructor(
    private assesment: AssesmentApiService,
    private users: UserApiService,
  ) {}

  ngOnInit(): void {
    // Modelo v13: cursos del profesor (getMySubjects), SO parametrizados y sus
    // rúbricas registradas (getRubrics). El código de curso es materia_curso.
    forkJoin({
      outcomes: this.assesment.getStudentOutcomes(),
      subjects: this.users.getMySubjects(),
      rubrics: this.assesment.getRubrics(),
    }).subscribe({
      next: ({ outcomes, subjects, rubrics }) => {
        this.outcomes.set(outcomes ?? []);
        this.courses.set((subjects as Subject[] ?? []).map(s => ({ code: s.materia_curso, name: s.name })));
        this.rubricsCount.set((rubrics ?? []).length);
        this.studentsCount.set(new Set((rubrics ?? []).map(r => r.student_id)).size);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la información. Verifica tu conexión con el servidor.');
        this.loading.set(false);
      },
    });
  }
}
