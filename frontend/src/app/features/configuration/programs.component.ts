import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { UserMsService } from '../../core/services/user-ms.service';
import { BadgeComponent } from '../../shared/atoms/badge/badge.component';
import { ButtonComponent } from '../../shared/atoms/button/button.component';
import { CardComponent } from '../../shared/atoms/card/card.component';

interface AcademicProgram {
  id: number;
  name: string;
  code: string;
  accreditation: string;
  progress: number;
  status: 'acreditado' | 'en-proceso' | 'evaluacion';
}

const EMPTY_PROGRAM: AcademicProgram = {
  id: 0,
  name: '',
  code: '',
  accreditation: '',
  progress: 0,
  status: 'en-proceso'
};

@Component({
  selector: 'mx-programs',
  standalone: true,
  imports: [CommonModule, FormsModule, BadgeComponent, ButtonComponent, CardComponent],
  template: `
    <section class="page">
      <div class="heading">
        <div>
          <span>Gestion / Programas</span>
          <h1>Programas academicos</h1>
          <p>Programas de la Facultad de Ingenieria en proceso de acreditacion ABET y MESOFTX.</p>
        </div>
        <mx-button icon="pi-plus" (clicked)="newProgram()">Nuevo programa</mx-button>
      </div>

      <section class="program-grid">
        <article *ngFor="let program of programs()" class="program-card">
          <div class="top">
            <span class="code">{{ program.code }}</span>
            <mx-badge [tone]="program.status === 'acreditado' ? 'success' : program.status === 'evaluacion' ? 'secondary' : 'warning'">{{ labelFor(program.status) }}</mx-badge>
          </div>
          <h2>{{ program.name }}</h2>
          <p>{{ program.accreditation }}</p>
          <div class="progress-line">
            <span>Cumplimiento ABET/MESOFTX</span>
            <strong>{{ program.progress }}%</strong>
          </div>
          <div class="track">
            <div [style.width.%]="program.progress" [style.background]="accentFor(program.progress)"></div>
          </div>
          <div class="actions">
            <button type="button" (click)="editProgram(program)"><i class="pi pi-pencil"></i></button>
            <button type="button" (click)="deleteProgram(program.id)"><i class="pi pi-trash"></i></button>
          </div>
        </article>
      </section>

      <mx-card>
        <h2>{{ editingId() ? 'Editar programa' : 'Registrar programa' }}</h2>
        <form class="form" (ngSubmit)="saveProgram()">
          <label>Nombre<input name="name" [(ngModel)]="draft.name" required></label>
          <label>Codigo<input name="code" [(ngModel)]="draft.code" required maxlength="12"></label>
          <label>Acreditacion<input name="accreditation" [(ngModel)]="draft.accreditation" required></label>
          <label>Avance<input name="progress" type="number" min="0" max="100" [(ngModel)]="draft.progress"></label>
          <label>Estado
            <select name="status" [(ngModel)]="draft.status">
              <option value="acreditado">Acreditado</option>
              <option value="en-proceso">En proceso</option>
              <option value="evaluacion">Evaluacion</option>
            </select>
          </label>
          <div class="form-actions">
            <mx-button type="submit" icon="pi-save">Guardar</mx-button>
            <mx-button type="button" variant="ghost" (clicked)="newProgram()">Limpiar</mx-button>
          </div>
        </form>
      </mx-card>
    </section>
  `,
  styles: [`
    .page { padding: 28px; }
    .heading { align-items: flex-start; display: flex; justify-content: space-between; margin-bottom: 22px; }
    .heading span { color: var(--mx-muted); font-size: 12px; font-weight: 800; }
    h1 { font-size: 26px; margin: 8px 0 7px; }
    p { color: var(--mx-muted); font-size: 13px; margin: 0; }
    .program-grid { display: grid; gap: 16px; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-bottom: 18px; }
    .program-card { background: #fff; border: 1px solid var(--mx-border); border-radius: var(--mx-radius-card); box-shadow: var(--mx-shadow-soft); padding: 18px; }
    .top, .progress-line, .actions { align-items: center; display: flex; justify-content: space-between; }
    .code { background: #f3e8ff; border-radius: 8px; color: var(--mx-secondary); font-size: 12px; font-weight: 800; padding: 7px 10px; }
    .program-card h2 { font-size: 17px; margin: 16px 0 5px; }
    .progress-line { color: var(--mx-muted); font-size: 12px; font-weight: 800; margin-top: 16px; }
    .progress-line strong { color: var(--mx-ink); }
    .track { background: #eef0f3; border-radius: 999px; height: 8px; margin-top: 9px; overflow: hidden; }
    .track div { border-radius: inherit; height: 100%; }
    .actions { gap: 8px; justify-content: flex-end; margin-top: 14px; }
    .actions button { background: #f7f7f9; border: 1px solid var(--mx-border); border-radius: 8px; cursor: pointer; height: 34px; width: 34px; }
    .form { display: grid; gap: 14px; grid-template-columns: repeat(6, minmax(0, 1fr)); margin-top: 16px; }
    label { color: #55515e; display: grid; font-size: 12px; font-weight: 800; gap: 7px; }
    input, select { border: 1px solid var(--mx-border); border-radius: 8px; min-height: 40px; padding: 0 11px; }
    .form-actions { align-items: end; display: flex; gap: 10px; }
    @media (max-width: 1000px) { .program-grid, .form { grid-template-columns: 1fr; } .heading { display: grid; gap: 14px; } }
  `]
})
export class ProgramsComponent implements OnInit {
  private readonly userMsService = inject(UserMsService);
  readonly editingId = signal<number | null>(null);
  readonly programs = signal<AcademicProgram[]>([
    { id: 1, name: 'Ingenieria de Sistemas', code: 'IS', accreditation: 'Acreditado ABET · vigente 2024-2030', progress: 88, status: 'acreditado' },
    { id: 2, name: 'Ingenieria Industrial', code: 'II', accreditation: 'En proceso de acreditacion', progress: 74, status: 'en-proceso' },
    { id: 3, name: 'Ingenieria Biomedica', code: 'IB', accreditation: 'Acreditado ABET · vigente 2023-2029', progress: 81, status: 'acreditado' },
    { id: 4, name: 'Ingenieria Mecatronica', code: 'IM', accreditation: 'Autoevaluacion inicial', progress: 68, status: 'evaluacion' }
  ]);
  draft: AcademicProgram = { ...EMPTY_PROGRAM };

  ngOnInit(): void {
    this.userMsService.careers().subscribe({
      next: (careers) => {
        if (careers.length) {
          this.programs.set(careers.map((career, index) => ({
            id: career.id,
            name: career.name,
            code: career.code,
            accreditation: career.description || 'Configuracion base del programa academico',
            progress: [88, 74, 81, 68, 79][index % 5],
            status: index % 3 === 0 ? 'acreditado' : index % 3 === 1 ? 'en-proceso' : 'evaluacion'
          })));
        }
      },
      error: () => undefined
    });
  }

  newProgram(): void {
    this.editingId.set(null);
    this.draft = { ...EMPTY_PROGRAM };
  }

  editProgram(program: AcademicProgram): void {
    this.editingId.set(program.id);
    this.draft = { ...program };
  }

  saveProgram(): void {
    const editingId = this.editingId();
    const normalized = { ...this.draft, progress: Number(this.draft.progress) || 0 };
    if (editingId) {
      this.programs.update((items) => items.map((item) => item.id === editingId ? { ...normalized, id: editingId } : item));
    } else {
      const nextId = Math.max(0, ...this.programs().map((item) => item.id)) + 1;
      this.programs.update((items) => [...items, { ...normalized, id: nextId }]);
    }
    this.newProgram();
  }

  deleteProgram(id: number): void {
    this.programs.update((items) => items.filter((item) => item.id !== id));
  }

  accentFor(progress: number): string {
    return progress >= 80 ? '#16a34a' : progress >= 70 ? '#ea580c' : '#dc2626';
  }

  labelFor(status: AcademicProgram['status']): string {
    return status === 'acreditado' ? 'Acreditado' : status === 'evaluacion' ? 'Evaluacion' : 'En proceso';
  }
}
