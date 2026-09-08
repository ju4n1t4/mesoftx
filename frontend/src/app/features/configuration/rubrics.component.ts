import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AssesmentMsService, StudentOutcomeRecord } from '../../core/services/assesment-ms.service';
import { BadgeComponent } from '../../shared/atoms/badge/badge.component';
import { ButtonComponent } from '../../shared/atoms/button/button.component';
import { CardComponent } from '../../shared/atoms/card/card.component';

interface RubricIndicator {
  id: number;
  code: string;
  description: string;
  n1: string;
  n2: string;
  n3: string;
  n4: string;
}

@Component({
  selector: 'mx-rubrics',
  standalone: true,
  imports: [CommonModule, FormsModule, BadgeComponent, ButtonComponent, CardComponent],
  template: `
    <section class="page">
      <div class="heading">
        <div>
          <span>Configuracion / Parametrizacion de la rubrica</span>
          <h1>Parametrizacion rubricas</h1>
          <p>Configura los Student Outcomes, identificadores de desempeno y descriptores por nivel de logro.</p>
        </div>
        <mx-button icon="pi-cloud-upload">Publicar cambios</mx-button>
      </div>

      <div class="notice">
        <i class="pi pi-pencil"></i>
        <div>
          <strong>Lo que publiques aqui es exactamente la rubrica que vera el docente al valorar.</strong>
          <span>Los cambios se reflejan en el modulo Registrar valoracion cuando el backend habilite persistencia de rubricas.</span>
        </div>
      </div>

      <section class="tabs">
        <button *ngFor="let outcome of outcomes()" type="button" [class.active]="outcome.id === selectedOutcomeId()" (click)="selectOutcome(outcome.id)">
          {{ outcome.code }}
        </button>
      </section>

      <mx-card>
        <div class="outcome">
          <span>{{ selectedOutcome()?.code }}</span>
          <div>
            <strong>Descripcion del Student Outcome</strong>
            <p>{{ selectedOutcome()?.description }}</p>
          </div>
        </div>
      </mx-card>

      <section class="rubric-table">
        <div class="table-head">
          <span>ID · Detalle</span>
          <span><i class="dot red"></i>Insatisfactorio</span>
          <span><i class="dot orange"></i>En desarrollo</span>
          <span><i class="dot yellow"></i>Bueno</span>
          <span><i class="dot green"></i>Supera</span>
          <span></span>
        </div>
        <article *ngFor="let indicator of indicators()" class="rubric-row">
          <textarea [(ngModel)]="indicator.description" aria-label="Descripcion"></textarea>
          <textarea [(ngModel)]="indicator.n1" class="n1" aria-label="Nivel insatisfactorio"></textarea>
          <textarea [(ngModel)]="indicator.n2" class="n2" aria-label="Nivel en desarrollo"></textarea>
          <textarea [(ngModel)]="indicator.n3" class="n3" aria-label="Nivel bueno"></textarea>
          <textarea [(ngModel)]="indicator.n4" class="n4" aria-label="Nivel supera"></textarea>
          <button type="button" (click)="deleteIndicator(indicator.id)"><i class="pi pi-trash"></i></button>
        </article>
      </section>

      <mx-card>
        <h2>Agregar identificador</h2>
        <form class="form" (ngSubmit)="addIndicator()">
          <label>Codigo<input name="code" [(ngModel)]="draft.code" required></label>
          <label>Descripcion<input name="description" [(ngModel)]="draft.description" required></label>
          <label>N1<input name="n1" [(ngModel)]="draft.n1" required></label>
          <label>N2<input name="n2" [(ngModel)]="draft.n2" required></label>
          <label>N3<input name="n3" [(ngModel)]="draft.n3" required></label>
          <label>N4<input name="n4" [(ngModel)]="draft.n4" required></label>
          <mx-button type="submit" icon="pi-plus">Agregar</mx-button>
        </form>
        <p class="counter">{{ indicators().length }} identificadores configurados para {{ selectedOutcome()?.code }}</p>
      </mx-card>
    </section>
  `,
  styles: [`
    .page { padding: 28px; }
    .heading { align-items: flex-start; display: flex; justify-content: space-between; margin-bottom: 18px; }
    .heading span { color: var(--mx-muted); font-size: 12px; font-weight: 800; }
    h1 { font-size: 26px; margin: 8px 0 7px; }
    p { color: var(--mx-muted); font-size: 13px; margin: 0; }
    .notice { align-items: center; background: var(--mx-sidebar); border-radius: 8px; color: #fff; display: flex; gap: 13px; margin-bottom: 18px; padding: 14px 16px; }
    .notice i { align-items: center; background: var(--mx-primary); border-radius: 8px; display: inline-flex; height: 38px; justify-content: center; width: 38px; }
    .notice strong, .notice span { display: block; }
    .notice span { color: #c9c5d4; font-size: 12px; margin-top: 3px; }
    .tabs { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; }
    .tabs button { background: #fff; border: 1px solid var(--mx-border); border-radius: 8px; color: #6f6a77; cursor: pointer; font-weight: 800; min-height: 36px; padding: 0 14px; }
    .tabs button.active { background: var(--mx-secondary); border-color: var(--mx-secondary); color: #fff; }
    .outcome { align-items: center; display: flex; gap: 14px; }
    .outcome > span { align-items: center; background: var(--mx-secondary); border-radius: 8px; color: #fff; display: inline-flex; font-weight: 800; height: 42px; justify-content: center; min-width: 42px; }
    .outcome strong { display: block; font-size: 14px; margin-bottom: 4px; }
    .rubric-table { display: grid; gap: 8px; margin: 18px 0; overflow-x: auto; }
    .table-head, .rubric-row { display: grid; gap: 8px; grid-template-columns: minmax(180px, 1.1fr) repeat(4, minmax(170px, 1fr)) 42px; min-width: 980px; }
    .table-head { color: #7c7684; font-size: 11px; font-weight: 800; text-transform: uppercase; }
    .table-head span { align-items: center; display: flex; gap: 6px; }
    .dot { border-radius: 999px; display: inline-block; height: 7px; width: 7px; }
    .red { background: var(--mx-danger); } .orange { background: #ea580c; } .yellow { background: #eab308; } .green { background: var(--mx-success); }
    textarea { border: 1px solid var(--mx-border); border-radius: 8px; color: #3f3a45; font: 600 12px var(--mx-font); min-height: 86px; padding: 10px; resize: vertical; }
    textarea.n1 { background: #fff1f2; } textarea.n2 { background: #fff7ed; } textarea.n3 { background: #fefce8; } textarea.n4 { background: #ecfdf3; }
    .rubric-row button { align-self: center; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; color: var(--mx-danger); cursor: pointer; height: 34px; width: 34px; }
    h2 { font-size: 17px; margin: 0 0 16px; }
    .form { display: grid; gap: 12px; grid-template-columns: repeat(6, minmax(0, 1fr)) auto; }
    label { color: #55515e; display: grid; font-size: 12px; font-weight: 800; gap: 7px; }
    input { border: 1px solid var(--mx-border); border-radius: 8px; min-height: 40px; padding: 0 11px; }
    .counter { color: var(--mx-muted); font-weight: 800; margin-top: 14px; text-align: right; }
    @media (max-width: 980px) { .heading { display: grid; gap: 14px; } .form { grid-template-columns: 1fr; } }
  `]
})
export class RubricsComponent implements OnInit {
  private readonly assesmentMsService = inject(AssesmentMsService);
  readonly outcomes = signal<StudentOutcomeRecord[]>([
    { id: 1, code: 'S.O.1', description: 'Habilidad para identificar, formular y resolver problemas complejos de ingenieria aplicando principios de ingenieria, ciencia y matematicas.' },
    { id: 2, code: 'S.O.2', description: 'Habilidad para aplicar diseno de ingenieria considerando salud, seguridad y bienestar.' }
  ]);
  readonly selectedOutcomeId = signal(1);
  readonly rubricMap = signal<Record<number, RubricIndicator[]>>({
    1: [
      { id: 1, code: 'ID1', description: 'Identifica variables de problemas complejos de ingenieria.', n1: 'Identifica con limitaciones las variables.', n2: 'Identifica parcialmente las variables.', n3: 'Identifica correctamente variables y componentes.', n4: 'Identifica detalladamente variables y relaciones.' },
      { id: 2, code: 'ID2', description: 'Formula modelos fisicos y matematicos para la solucion.', n1: 'No formula modelos adecuados.', n2: 'Formula modelos basicos incompletos.', n3: 'Formula modelos coherentes.', n4: 'Formula modelos relevantes y robustos.' }
    ],
    2: []
  });
  draft: RubricIndicator = this.emptyDraft();

  readonly selectedOutcome = computed(() => this.outcomes().find((outcome) => outcome.id === this.selectedOutcomeId()));
  readonly indicators = computed(() => this.rubricMap()[this.selectedOutcomeId()] ?? []);

  ngOnInit(): void {
    this.assesmentMsService.studentOutcomes().subscribe({
      next: (outcomes) => {
        if (outcomes.length) {
          this.outcomes.set(outcomes);
          this.selectedOutcomeId.set(outcomes[0].id);
          this.rubricMap.update((current) => outcomes.reduce<Record<number, RubricIndicator[]>>((acc, outcome) => ({ ...acc, [outcome.id]: current[outcome.id] ?? [] }), current));
        }
      },
      error: () => undefined
    });
  }

  selectOutcome(outcomeId: number): void {
    this.selectedOutcomeId.set(outcomeId);
    this.draft = this.emptyDraft();
  }

  addIndicator(): void {
    const outcomeId = this.selectedOutcomeId();
    const nextId = Math.max(0, ...this.indicators().map((item) => item.id)) + 1;
    this.rubricMap.update((current) => ({ ...current, [outcomeId]: [...(current[outcomeId] ?? []), { ...this.draft, id: nextId }] }));
    this.draft = this.emptyDraft();
  }

  deleteIndicator(id: number): void {
    const outcomeId = this.selectedOutcomeId();
    this.rubricMap.update((current) => ({ ...current, [outcomeId]: (current[outcomeId] ?? []).filter((item) => item.id !== id) }));
  }

  private emptyDraft(): RubricIndicator {
    return { id: 0, code: '', description: '', n1: '', n2: '', n3: '', n4: '' };
  }
}
