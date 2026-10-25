import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LegalFooterComponent } from '../../../../../shared/ui/molecules/legal-footer/legal-footer.component';
import { AssesmentGateway as AssesmentApiService } from '../../../application/ports/assesment-api.service.port';
import { PublicIndicators } from '../../../domain/models/abet.models';

interface OutcomeCard {
  code: string;
  desc: string;
  color: string;
  students: number;
  suppressed: boolean;
  levels: { label: string; class: string; pct: number; barColor: string }[];
}

@Component({
  selector: 'app-publico',
  standalone: true,
  imports: [CommonModule, RouterLink, LegalFooterComponent],
  templateUrl: './publico.component.html',
  styleUrl: './publico.component.scss'
})
export class PublicoComponent implements OnInit {
  loading = signal(true);
  error   = signal<string | null>(null);
  outcomes = signal<OutcomeCard[]>([]);
  totalAssessments = signal(0);
  avgPct = signal<number | null>(null);
  minGroup = signal(5);

  private palette = ['#7C3AED', '#0369A1', '#EA580C', '#16A34A', '#CA8A04', '#DC2626'];

  constructor(private assesment: AssesmentApiService) {}

  ngOnInit(): void {
    // Un solo endpoint público que devuelve únicamente agregados por Student
    // Outcome. No se descargan valoraciones individuales ni datos personales.
    this.assesment.getPublicIndicators().subscribe({
      next: (res: PublicIndicators) => {
        this.minGroup.set(res.min_group_size);
        this.totalAssessments.set(res.total_assessments);
        this.avgPct.set(res.average_pct);
        this.outcomes.set(res.items.map((it, i) => ({
          code: it.so_id,
          desc: it.description,
          color: this.palette[i % this.palette.length],
          students: it.students,
          suppressed: it.suppressed,
          levels: it.levels.map(l => ({
            label: l.label,
            class: 'n' + l.rank,
            pct: l.pct,
            barColor: ({ 4: '#16A34A', 3: '#CA8A04', 2: '#EA580C', 1: '#DC2626' } as Record<number, string>)[l.rank],
          })),
        })));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los indicadores. Intente de nuevo más tarde.');
        this.loading.set(false);
      },
    });
  }
}
