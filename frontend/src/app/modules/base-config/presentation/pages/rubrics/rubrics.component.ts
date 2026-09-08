import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { BaseConfigUseCase } from '../../../application/use-cases/base-config.usecase';
import { RubricIndicator, StudentOutcomeRecord } from '../../../domain/models/base-config.models';
import { ButtonComponent } from '../../../../../shared/ui/atoms/button/button.component';
import { CardComponent } from '../../../../../shared/ui/atoms/card/card.component';

@Component({
  selector: 'mx-rubrics',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, CardComponent],
  templateUrl: './rubrics.component.html',
  styleUrl: './rubrics.component.scss'
})
export class RubricsComponent implements OnInit {
  private readonly baseConfig = inject(BaseConfigUseCase);
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
    this.baseConfig.gateway.studentOutcomes().subscribe({
      next: (outcomes) => {
        if (!outcomes.length) {
          return;
        }
        this.outcomes.set(outcomes);
        this.selectedOutcomeId.set(outcomes[0].id);
        this.rubricMap.update((current) => outcomes.reduce<Record<number, RubricIndicator[]>>(
          (acc, outcome) => ({ ...acc, [outcome.id]: current[outcome.id] ?? [] }),
          current
        ));
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
