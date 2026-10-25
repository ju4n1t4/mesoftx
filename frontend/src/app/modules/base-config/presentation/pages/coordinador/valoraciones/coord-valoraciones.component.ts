import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AssesmentGateway as AssesmentApiService } from '../../../../application/ports/assesment-api.service.port';
import { StudentOutcome, Rubric } from '../../../../domain/models/abet.models';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-coord-valoraciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './coord-valoraciones.component.html',
  styleUrl: './coord-valoraciones.component.scss'
})
export class CoordValoracionesComponent implements OnInit {
  loading = signal(true);
  error   = signal('');
  results = signal<Rubric[]>([]);
  sos     = signal<StudentOutcome[]>([]);
  evidenceCount = signal(0);
  sosCount      = signal(0);

  constructor(private assesment: AssesmentApiService) {}

  ngOnInit() {
    forkJoin({
      results: this.assesment.getRubrics(),
      sos:     this.assesment.getStudentOutcomes(),
    }).subscribe({
      next: ({ results, sos }) => {
        this.results.set(results);
        this.sos.set(sos);
        this.sosCount.set(sos.length);
        // "Con evidencia" se cuenta desde las propias rúbricas (evidence_id no nulo).
        this.evidenceCount.set(results.filter(r => r.evidence_id != null).length);
        this.loading.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(typeof e.error?.detail === 'string' ? e.error.detail
          : 'No se pudo conectar con el servicio. Verifica que los microservicios estén activos.');
        this.loading.set(false);
      },
    });
  }
}
