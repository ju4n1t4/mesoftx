import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { AssesmentGateway as AssesmentApiService } from '../../../../application/ports/assesment-api.service.port';
import { StudentOutcome, Performance, Level, Rubric } from '../../../../domain/models/abet.models';

interface OutcomeRow { code: string; desc: string; pct: number; barColor: string; }

@Component({
  selector: 'app-inicio-acreditacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inicio-acreditacion.component.html',
  styleUrl: './inicio-acreditacion.component.scss'
})
export class InicioAcreditacionComponent implements OnInit {
  loading = signal(true);
  error   = signal<string | null>(null);
  outcomes = signal<OutcomeRow[]>([]);
  globalPct = signal<number | null>(null);
  inMeta = signal(0);
  studentsEvaluated = signal(0);

  private readonly META = 80;

  constructor(private assesment: AssesmentApiService) {}

  ngOnInit(): void {
    // v13: SO -> indicadores -> niveles, cruzados con las rúbricas. El logro de
    // cada SO es el promedio del score del rank de nivel de sus rúbricas.
    this.assesment.getStudentOutcomes().subscribe({
      next: sos => {
        if (!sos?.length) { this.outcomes.set([]); this.globalPct.set(null); this.loading.set(false); return; }
        forkJoin({
          perfsBySo: forkJoin(sos.map(so => this.assesment.getPerformances(so.id))),
          rubrics: this.assesment.getRubrics(),
        }).subscribe({
          next: ({ perfsBySo, rubrics }) => {
            const allPerfs = perfsBySo.reduce((acc, arr) => acc.concat(arr), [] as Performance[]);
            if (!allPerfs.length) { this.compute(sos, perfsBySo, allPerfs, [], rubrics ?? []); this.loading.set(false); return; }
            forkJoin(allPerfs.map(p => this.assesment.getLevels(p.id))).subscribe({
              next: levelsByPerf => { this.compute(sos, perfsBySo, allPerfs, levelsByPerf, rubrics ?? []); this.loading.set(false); },
              error: () => this.failLoad(),
            });
          },
          error: () => this.failLoad(),
        });
      },
      error: () => this.failLoad(),
    });
  }

  private failLoad(): void {
    this.error.set('No se pudieron cargar los indicadores. Verifica la conexión con el servidor.');
    this.loading.set(false);
  }

  private compute(
    sos: StudentOutcome[],
    perfsBySo: Performance[][],
    allPerfs: Performance[],
    levelsByPerf: Level[][],
    rubrics: Rubric[],
  ): void {
    const perfToSo = new Map<string, string>();
    perfsBySo.forEach((perfs, i) => perfs.forEach(p => perfToSo.set(p.id, sos[i].id)));
    const levelRank = new Map<string, number>();
    allPerfs.forEach((p, i) => (levelsByPerf[i] ?? []).forEach(l => levelRank.set(l.id, l.rank)));

    const scoreOf = (rank: number) => ({ 4: 100, 3: 75, 2: 50, 1: 25 } as Record<number, number>)[rank] ?? 0;

    const rows: OutcomeRow[] = sos.map(so => {
      const soRubrics = rubrics.filter(r => perfToSo.get(r.performance_id) === so.id);
      let pct = 0;
      if (soRubrics.length) {
        const sum = soRubrics.reduce((acc, r) => acc + scoreOf(levelRank.get(r.level_id) ?? 0), 0);
        pct = Math.round(sum / soRubrics.length);
      }
      return { code: so.id, desc: so.description ?? '', pct, barColor: this.barColor(pct) };
    });

    this.outcomes.set(rows);
    this.inMeta.set(rows.filter(r => r.pct >= this.META).length);

    const measured = rows.filter(r => r.pct > 0);
    this.globalPct.set(measured.length ? Math.round(measured.reduce((a, r) => a + r.pct, 0) / measured.length) : null);

    const students = new Set(rubrics
      .filter(r => perfToSo.has(r.performance_id))
      .map(r => r.student_id));
    this.studentsEvaluated.set(students.size);
  }

  private barColor(pct: number): string {
    if (pct >= 80) return '#16A34A';
    if (pct >= 70) return '#CA8A04';
    if (pct > 0)   return '#DC2626';
    return 'var(--border)';
  }
}
