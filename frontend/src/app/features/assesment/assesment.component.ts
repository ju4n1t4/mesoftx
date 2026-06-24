import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { EntityRecord, ResourceConfig } from '../../core/models/api.models';
import { AssesmentMsService } from '../../core/services/assesment-ms.service';
import { ButtonComponent } from '../../shared/atoms/button/button.component';
import { CardComponent } from '../../shared/atoms/card/card.component';
import { InputComponent } from '../../shared/atoms/input/input.component';
import { FormFieldComponent } from '../../shared/molecules/form-field/form-field.component';
import { DataTableComponent } from '../../shared/organisms/data-table/data-table.component';
import { ModulePageComponent } from '../../shared/templates/module-page/module-page.component';

const ASSESMENT_RESOURCES: ResourceConfig[] = [
  { key: 'student-outcomes', title: 'Student Outcomes', endpoint: 'student-outcomes', fields: [{ key: 'code', label: 'Codigo', type: 'text', required: true }, { key: 'description', label: 'Descripcion', type: 'textarea' }] },
  { key: 'performance-indicators', title: 'Indicadores de Desempeno', endpoint: 'performance-indicators', fields: [{ key: 'code', label: 'Codigo', type: 'text', required: true }, { key: 'name', label: 'Nombre', type: 'text' }] },
  { key: 'performance-indicator-details', title: 'Detalles de Indicador', endpoint: 'performance-indicator-details', fields: [{ key: 'performance_indicator_id', label: 'Indicador ID', type: 'number', required: true }, { key: 'student_outcome_id', label: 'SO ID', type: 'number', required: true }, { key: 'description', label: 'Descripcion', type: 'textarea', required: true }] },
  { key: 'performance-evaluations', title: 'Evaluaciones', endpoint: 'performance-evaluations', fields: [{ key: 'evaluation_value', label: 'Valor', type: 'text', required: true }] },
  { key: 'performance-evaluation-details', title: 'Detalles de Evaluacion', endpoint: 'performance-evaluation-details', fields: [{ key: 'performance_evaluation_id', label: 'Evaluacion ID', type: 'number', required: true }, { key: 'performance_indicator_id', label: 'Indicador ID', type: 'number', required: true }, { key: 'student_outcome_id', label: 'SO ID', type: 'number', required: true }, { key: 'description', label: 'Descripcion', type: 'textarea', required: true }] },
  { key: 'assesment-evidence', title: 'Evidencias', endpoint: 'assesment-evidence', fields: [{ key: 'evidence_name_doc', label: 'Documento', type: 'text', required: true }, { key: 'student_code', label: 'Codigo estudiante', type: 'text', required: true }, { key: 'student_outcome_id', label: 'SO ID', type: 'number', required: true }] },
  { key: 'assesment-results', title: 'Resultados', endpoint: 'assesment-results', fields: [{ key: 'subject_code', label: 'Materia', type: 'text', required: true }, { key: 'assesment_evidence_id', label: 'Evidencia ID', type: 'number', required: true }, { key: 'student_outcome_id', label: 'SO ID', type: 'number', required: true }, { key: 'performance_evaluation_detail_id', label: 'Detalle evaluacion ID', type: 'number', required: true }] }
];

@Component({
  selector: 'mx-assesment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModulePageComponent, CardComponent, ButtonComponent, InputComponent, FormFieldComponent, DataTableComponent],
  template: `
    <mx-module-page eyebrow="Assesment_MS" title="Modulo Assesment" description="Configuracion y registro de evaluacion ABET por outcomes, indicadores, evidencias y resultados." />
    <div class="tabs">
      <button *ngFor="let resource of resources" [class.active]="resource.key === activeResource().key" (click)="selectResource(resource)">{{ resource.title }}</button>
    </div>
    <section class="grid">
      <mx-card>
        <h2>{{ editingId() ? 'Editar' : 'Crear' }} {{ activeResource().title }}</h2>
        <form [formGroup]="form" (ngSubmit)="save()">
          <mx-form-field *ngFor="let field of activeResource().fields" [label]="field.label">
            <mx-input [type]="field.type" [formControlName]="field.key" />
          </mx-form-field>
          <p class="message" *ngIf="message()">{{ message() }}</p>
          <div class="actions">
            <mx-button type="submit" [disabled]="form.invalid || loading()">{{ loading() ? 'Guardando...' : 'Guardar' }}</mx-button>
            <mx-button type="button" variant="secondary" (clicked)="resetForm()">Limpiar</mx-button>
          </div>
        </form>
      </mx-card>
      <mx-card>
        <h2>Registros</h2>
        <mx-data-table [rows]="rows()" [columns]="columns()" (edit)="edit($event)" />
      </mx-card>
    </section>
  `,
  styles: [`
    .tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
    .tabs button {
      background: #fff;
      border: 1px solid var(--mx-border);
      border-radius: 10px;
      color: var(--mx-muted);
      cursor: pointer;
      font: 800 12px Inter, system-ui, sans-serif;
      min-height: 38px;
      padding: 0 12px;
    }
    .tabs button.active { background: var(--mx-primary); border-color: var(--mx-primary); color: #fff; }
    .grid { display: grid; gap: 18px; grid-template-columns: 380px minmax(0, 1fr); }
    h2 { color: var(--mx-ink); font: 800 18px Inter, system-ui, sans-serif; margin-bottom: 16px; }
    form { display: grid; gap: 13px; }
    .actions { display: flex; gap: 10px; }
    .message { color: var(--mx-danger); font: 700 12px Inter, system-ui, sans-serif; }
    @media (max-width: 1050px) { .grid { grid-template-columns: 1fr; } }
  `]
})
export class AssesmentComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  readonly resources = ASSESMENT_RESOURCES;
  readonly activeResource = signal<ResourceConfig>(ASSESMENT_RESOURCES[0]);
  readonly rows = signal<EntityRecord[]>([]);
  readonly loading = signal(false);
  readonly message = signal('');
  readonly editingId = signal<number | null>(null);
  form = this.formBuilder.group({});

  constructor(private readonly assesmentMsService: AssesmentMsService) {}

  ngOnInit(): void {
    this.buildForm();
    this.load();
  }

  columns(): string[] {
    const first = this.rows()[0];
    return first ? Object.keys(first).slice(0, 8) : ['id', ...this.activeResource().fields.map((field) => field.key)];
  }

  selectResource(resource: ResourceConfig): void {
    this.activeResource.set(resource);
    this.resetForm();
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.assesmentMsService.list(this.activeResource().endpoint).subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.message.set('No fue posible cargar los datos. Verifica Assesment_MS.');
        this.loading.set(false);
      }
    });
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }
    this.loading.set(true);
    const payload = this.cleanPayload(this.form.getRawValue() as EntityRecord);
    const request = this.editingId()
      ? this.assesmentMsService.update(this.activeResource().endpoint, this.editingId() as number, payload)
      : this.assesmentMsService.create(this.activeResource().endpoint, payload);
    request.subscribe({
      next: () => {
        this.resetForm();
        this.load();
      },
      error: () => {
        this.message.set('No fue posible guardar el registro.');
        this.loading.set(false);
      }
    });
  }

  edit(row: EntityRecord): void {
    this.editingId.set(Number(row['id']));
    this.form.patchValue(row);
  }

  resetForm(): void {
    this.editingId.set(null);
    this.message.set('');
    this.buildForm();
  }

  private buildForm(): void {
    const group: Record<string, unknown[]> = {};
    this.activeResource().fields.forEach((field) => {
      group[field.key] = ['', field.required ? [Validators.required] : []];
    });
    this.form = this.formBuilder.group(group);
  }

  private cleanPayload(payload: EntityRecord): EntityRecord {
    return Object.entries(payload).reduce<EntityRecord>((acc, [key, value]) => {
      if (value === '' || value == null) {
        return acc;
      }
      acc[key] = value;
      return acc;
    }, {});
  }
}
