import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';

import { BaseConfigUseCase } from '../../../application/use-cases/base-config.usecase';
import {
  PerformanceEvaluationDetailRecord,
  PerformanceEvaluationRecord,
  PerformanceIndicatorDetailRecord,
  PerformanceIndicatorRecord,
  RubricIndicator,
  StudentOutcomeRecord
} from '../../../domain/models/base-config.models';
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
  readonly evaluations = signal<PerformanceEvaluationRecord[]>([]);
  readonly message = signal('');
  draft: RubricIndicator = this.emptyDraft();

  readonly selectedOutcome = computed(() => this.outcomes().find((outcome) => outcome.id === this.selectedOutcomeId()));
  readonly indicators = computed(() => this.rubricMap()[this.selectedOutcomeId()] ?? []);

  ngOnInit(): void {
    forkJoin({
      outcomes: this.baseConfig.gateway.studentOutcomes(),
      indicators: this.baseConfig.gateway.performanceIndicators(),
      indicatorDetails: this.baseConfig.gateway.performanceIndicatorDetails(),
      evaluations: this.baseConfig.gateway.performanceEvaluations(),
      evaluationDetails: this.baseConfig.gateway.performanceEvaluationDetails()
    }).subscribe({
      next: ({ outcomes, indicators, indicatorDetails, evaluations, evaluationDetails }) => {
        if (!outcomes.length) {
          return;
        }
        this.outcomes.set(outcomes);
        this.evaluations.set(evaluations);
        this.selectedOutcomeId.set(outcomes[0].id);
        this.rubricMap.set(this.composeRubrics(outcomes, indicators, indicatorDetails, evaluations, evaluationDetails));
      },
      error: () => this.message.set('No fue posible consultar la parametrizacion de rubricas en Assesment_MS.')
    });
  }

  selectOutcome(outcomeId: number): void {
    this.selectedOutcomeId.set(outcomeId);
    this.draft = this.emptyDraft();
  }

  addIndicator(): void {
    const outcomeId = this.selectedOutcomeId();
    this.baseConfig.gateway.createPerformanceIndicator({ code: this.draft.code, name: this.draft.description }).pipe(
      switchMap((indicator) => this.persistRubric(indicator.id, outcomeId, this.draft).pipe(map((persisted) => ({ indicator, persisted }))))
    ).subscribe({
      next: ({ indicator, persisted }) => {
        const created: RubricIndicator = { ...this.draft, id: indicator.id, ...persisted };
        this.rubricMap.update((current) => ({ ...current, [outcomeId]: [...(current[outcomeId] ?? []), created] }));
        this.draft = this.emptyDraft();
        this.message.set('Indicador agregado en Assesment_MS.');
      },
      error: () => this.message.set('No fue posible crear el indicador en Assesment_MS.')
    });
  }

  deleteIndicator(id: number): void {
    const outcomeId = this.selectedOutcomeId();
    this.baseConfig.gateway.deletePerformanceIndicator(id).subscribe({
      next: () => this.rubricMap.update((current) => ({ ...current, [outcomeId]: (current[outcomeId] ?? []).filter((item) => item.id !== id) })),
      error: () => this.message.set('No fue posible eliminar el indicador en Assesment_MS.')
    });
  }

  publishChanges(): void {
    const outcomeId = this.selectedOutcomeId();
    const operations = this.indicators().flatMap((indicator) => [
      this.baseConfig.gateway.updatePerformanceIndicator(indicator.id, { code: indicator.code, name: indicator.description }),
      ...this.persistRubric(indicator.id, outcomeId, indicator, true)
    ]);
    if (!operations.length) {
      this.message.set('No hay indicadores para publicar.');
      return;
    }
    forkJoin(operations).subscribe({
      next: () => this.message.set('Cambios publicados en Assesment_MS.'),
      error: () => this.message.set('No fue posible publicar todos los cambios en Assesment_MS.')
    });
  }

  private emptyDraft(): RubricIndicator {
    return { id: 0, code: '', description: '', n1: '', n2: '', n3: '', n4: '' };
  }

  private composeRubrics(
    outcomes: StudentOutcomeRecord[],
    indicators: PerformanceIndicatorRecord[],
    indicatorDetails: PerformanceIndicatorDetailRecord[],
    evaluations: PerformanceEvaluationRecord[],
    evaluationDetails: PerformanceEvaluationDetailRecord[]
  ): Record<number, RubricIndicator[]> {
    return outcomes.reduce<Record<number, RubricIndicator[]>>((acc, outcome) => {
      const detailsForOutcome = indicatorDetails.filter((detail) => detail.student_outcome_id === outcome.id);
      acc[outcome.id] = detailsForOutcome.map((detail) => {
        const indicator = indicators.find((item) => item.id === detail.performance_indicator_id);
        const levels = this.levelsFor(detail.performance_indicator_id, outcome.id, evaluations, evaluationDetails);
        return {
          id: detail.performance_indicator_id,
          detail_id: detail.id,
          code: indicator?.code ?? `ID${detail.performance_indicator_id}`,
          description: detail.description,
          ...levels
        };
      });
      return acc;
    }, {});
  }

  private levelsFor(
    indicatorId: number,
    outcomeId: number,
    evaluations: PerformanceEvaluationRecord[],
    details: PerformanceEvaluationDetailRecord[]
  ): Pick<RubricIndicator, 'n1' | 'n2' | 'n3' | 'n4' | 'n1_id' | 'n2_id' | 'n3_id' | 'n4_id'> {
    const levelDetail = (evaluation: PerformanceEvaluationRecord | undefined) => details.find((detail) =>
      detail.performance_indicator_id === indicatorId &&
      detail.student_outcome_id === outcomeId &&
      detail.performance_evaluation_id === evaluation?.id
    );
    const n1 = levelDetail(this.evaluationByText(evaluations, 'insatisfactorio'));
    const n2 = levelDetail(this.evaluationByText(evaluations, 'desarrollo'));
    const n3 = levelDetail(this.evaluationByText(evaluations, 'bueno'));
    const n4 = levelDetail(this.evaluationByText(evaluations, 'supera'));
    return {
      n1: n1?.description ?? '',
      n2: n2?.description ?? '',
      n3: n3?.description ?? '',
      n4: n4?.description ?? '',
      n1_id: n1?.id,
      n2_id: n2?.id,
      n3_id: n3?.id,
      n4_id: n4?.id
    };
  }

  private persistRubric(indicatorId: number, outcomeId: number, indicator: RubricIndicator, asList: true): Observable<unknown>[];
  private persistRubric(indicatorId: number, outcomeId: number, indicator: RubricIndicator, asList?: false): Observable<Partial<RubricIndicator>>;
  private persistRubric(indicatorId: number, outcomeId: number, indicator: RubricIndicator, asList = false): Observable<unknown>[] | Observable<Partial<RubricIndicator>> {
    const detailOperation = indicator.detail_id
      ? this.baseConfig.gateway.updatePerformanceIndicatorDetail(indicator.detail_id, { description: indicator.description })
      : this.baseConfig.gateway.createPerformanceIndicatorDetail({ performance_indicator_id: indicatorId, student_outcome_id: outcomeId, description: indicator.description });
    const levelOperations = [
      this.levelOperation(indicator.n1_id, 'insatisfactorio', indicator.n1, indicatorId, outcomeId),
      this.levelOperation(indicator.n2_id, 'desarrollo', indicator.n2, indicatorId, outcomeId),
      this.levelOperation(indicator.n3_id, 'bueno', indicator.n3, indicatorId, outcomeId),
      this.levelOperation(indicator.n4_id, 'supera', indicator.n4, indicatorId, outcomeId)
    ].filter((operation): operation is Observable<PerformanceEvaluationDetailRecord> => Boolean(operation));

    if (asList) {
      return [detailOperation, ...levelOperations];
    }

    return forkJoin({ detail: detailOperation, levels: levelOperations.length ? forkJoin(levelOperations) : of([]) }).pipe(
      map(({ detail, levels }) => ({
        detail_id: detail.id,
        n1_id: levels[0]?.id,
        n2_id: levels[1]?.id,
        n3_id: levels[2]?.id,
        n4_id: levels[3]?.id
      }))
    );
  }

  private levelOperation(
    detailId: number | undefined,
    evaluationText: string,
    description: string,
    indicatorId: number,
    outcomeId: number
  ): Observable<PerformanceEvaluationDetailRecord> | null {
    const evaluation = this.evaluationByText(this.evaluations(), evaluationText);
    if (!evaluation || !description.trim()) {
      return null;
    }
    const payload = {
      performance_evaluation_id: evaluation.id,
      performance_indicator_id: indicatorId,
      student_outcome_id: outcomeId,
      description
    };
    return detailId
      ? this.baseConfig.gateway.updatePerformanceEvaluationDetail(detailId, payload)
      : this.baseConfig.gateway.createPerformanceEvaluationDetail(payload);
  }

  private evaluationByText(evaluations: PerformanceEvaluationRecord[], text: string): PerformanceEvaluationRecord | undefined {
    return evaluations.find((evaluation) => evaluation.evaluation_value.toLowerCase().includes(text));
  }
}
