import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserApiService } from '../../../core/services/user-api.service';
import { Career, Faculty } from '../../../core/models/abet.models';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-programas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="content-area">
      <div class="page-header">
        <h1>Programas académicos</h1>
        <p>Programas de la Facultad de Ingeniería en proceso de acreditación ABET.</p>
      </div>

      <div class="notice" *ngIf="error()">
        <i class="pi pi-info-circle"></i>
        <span>{{ error() }}</span>
      </div>

      <ng-container *ngIf="!loading()">
        <div class="empty-state" *ngIf="programs().length === 0">
          <div class="empty-icon"><i class="pi pi-building"></i></div>
          <div class="empty-title">No hay programas registrados</div>
          <div class="empty-desc">Aún no se han registrado carreras en la base de datos.</div>
        </div>

        <div class="prog-grid" *ngIf="programs().length > 0">
          <div class="prog-card" *ngFor="let p of programs()">
            <div class="pc-top">
              <span class="pc-code">{{ p.code }}</span>
              <span class="pc-acc" [class.on]="p.accredited">
                <i class="pi" [class.pi-verified]="p.accredited" [class.pi-clock]="!p.accredited"></i>
                {{ p.accredited ? 'Acreditada' : 'En proceso' }}
              </span>
            </div>
            <div class="pc-name">{{ p.name }}</div>
            <div class="pc-meta">{{ p.faculty || 'Facultad de Ingeniería' }}</div>
            <div class="pc-acc-year" *ngIf="p.accredited && p.accreditation_end_year">
              Acreditación vigente hasta {{ p.accreditation_end_year }}
            </div>
            <div class="pc-desc" *ngIf="p.description">{{ p.description }}</div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .notice { display: flex; align-items: center; gap: 10px; background: rgba(255,165,2,0.08); border: 1px solid rgba(255,165,2,0.25); border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 16px; font-size: 13px; color: var(--text-muted); }
    .notice i { color: var(--primary); flex-shrink: 0; }

    .empty-state { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 48px; text-align: center; }
    .empty-icon { font-size: 40px; color: var(--border); margin-bottom: 12px; }
    .empty-title { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
    .empty-desc { font-size: 13px; color: var(--text-muted); }

    .prog-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .prog-card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 20px; }
    .pc-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .pc-code { font-size: 12px; font-weight: 700; color: var(--accent); background: rgba(124,58,237,0.08); padding: 3px 10px; border-radius: 4px; }
    .pc-acc { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; color: var(--badge-expired); background: rgba(220,38,38,0.08); }
    .pc-acc.on { color: var(--badge-open); background: rgba(22,163,74,0.1); }
    .pc-acc i { font-size: 12px; }
    .pc-name { font-size: 16px; font-weight: 700; color: var(--text); }
    .pc-meta { font-size: 12px; color: var(--text-muted); margin: 2px 0; }
    .pc-acc-year { font-size: 12px; font-weight: 600; color: var(--badge-open); margin-top: 4px; }
    .pc-desc { font-size: 13px; color: var(--text-muted); line-height: 1.5; margin-top: 8px; }
  `]
})
export class ProgramasComponent implements OnInit {
  loading = signal(true);
  error   = signal('');
  programs = signal<(Career & { faculty?: string })[]>([]);

  constructor(private userApi: UserApiService) {}

  ngOnInit() {
    forkJoin({
      careers:   this.userApi.getCareers(),
      faculties: this.userApi.getFaculties(),
    }).subscribe({
      next: (r) => {
        const facMap = new Map<number, string>(r.faculties.map((f: Faculty) => [f.id, f.name]));
        this.programs.set(r.careers.map(c => ({ ...c, faculty: facMap.get(c.faculty_id) })));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo conectar con el servicio. Verifica que los microservicios estén activos.');
        this.loading.set(false);
      },
    });
  }
}
