import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, forkJoin } from 'rxjs';

import { EntityRecord, ResourceConfig, ResourceOption } from '../../core/models/api.models';
import { UserMsService } from '../../core/services/user-ms.service';
import { ButtonComponent } from '../../shared/atoms/button/button.component';
import { CardComponent } from '../../shared/atoms/card/card.component';
import { InputComponent } from '../../shared/atoms/input/input.component';
import { FormFieldComponent } from '../../shared/molecules/form-field/form-field.component';
import { DataTableComponent } from '../../shared/organisms/data-table/data-table.component';
import { ModulePageComponent } from '../../shared/templates/module-page/module-page.component';

const USER_RESOURCES: ResourceConfig[] = [
  {
    key: 'users',
    title: 'Usuarios',
    endpoint: 'users',
    fields: [
      { key: 'name', label: 'Nombre', type: 'text', required: true },
      { key: 'surname', label: 'Apellido', type: 'text', required: true },
      { key: 'code', label: 'Codigo', type: 'text', required: true },
      { key: 'email', label: 'Correo', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password' },
      { key: 'role_id', label: 'Rol', type: 'select', required: true, optionSource: 'roles' },
      { key: 'career_id', label: 'Carrera', type: 'select', required: true, optionSource: 'careers' },
      { key: 'subject_ids', label: 'Materias', type: 'multiselect', optionSource: 'subjects' }
    ]
  },
  { key: 'roles', title: 'Roles', endpoint: 'roles', fields: [{ key: 'name', label: 'Nombre', type: 'text', required: true }, { key: 'description', label: 'Descripcion', type: 'textarea' }] },
  { key: 'years', title: 'Anios', endpoint: 'years', fields: [{ key: 'year', label: 'Anio', type: 'number', required: true }] },
  { key: 'periods', title: 'Periodos', endpoint: 'periods', fields: [{ key: 'period', label: 'Periodo', type: 'text', required: true }] },
  { key: 'academic-periods', title: 'Periodos Academicos', endpoint: 'academic-periods', fields: [{ key: 'period_id', label: 'Periodo', type: 'select', required: true, optionSource: 'periods' }, { key: 'year_id', label: 'Anio', type: 'select', required: true, optionSource: 'years' }] },
  { key: 'faculty', title: 'Facultades', endpoint: 'faculty', fields: [{ key: 'name', label: 'Nombre', type: 'text', required: true }, { key: 'code', label: 'Codigo', type: 'text', required: true }, { key: 'description', label: 'Descripcion', type: 'textarea' }] },
  { key: 'careers', title: 'Carreras', endpoint: 'careers', fields: [{ key: 'name', label: 'Nombre', type: 'text', required: true }, { key: 'code', label: 'Codigo', type: 'text', required: true }, { key: 'faculty_id', label: 'Facultad', type: 'select', required: true, optionSource: 'faculty' }, { key: 'description', label: 'Descripcion', type: 'textarea' }] },
  { key: 'subjects', title: 'Materias', endpoint: 'subjects', fields: [{ key: 'name', label: 'Nombre', type: 'text', required: true }, { key: 'code', label: 'Codigo', type: 'text', required: true }, { key: 'career_id', label: 'Carrera', type: 'select', required: true, optionSource: 'careers' }, { key: 'description', label: 'Descripcion', type: 'textarea' }] }
];

@Component({
  selector: 'mx-user-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModulePageComponent, CardComponent, ButtonComponent, InputComponent, FormFieldComponent, DataTableComponent],
  template: `
    <mx-module-page eyebrow="User_MS" title="Gestion de Usuarios" description="Administracion de usuarios, roles y catalogos academicos consumiendo endpoints protegidos con JWT." />
    <div class="tabs">
      <button *ngFor="let resource of resources" [class.active]="resource.key === activeResource().key" (click)="selectResource(resource)">{{ resource.title }}</button>
    </div>
    <section class="grid">
      <mx-card>
        <h2>{{ editingId() ? 'Editar' : 'Crear' }} {{ activeResource().title }}</h2>
        <form [formGroup]="form" (ngSubmit)="save()">
          <mx-form-field *ngFor="let field of activeResource().fields" [label]="field.label">
            <mx-input [type]="field.type" [options]="optionsFor(field.optionSource)" [formControlName]="field.key" />
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
export class UserManagementComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  readonly resources = USER_RESOURCES;
  readonly activeResource = signal<ResourceConfig>(USER_RESOURCES[0]);
  readonly rows = signal<EntityRecord[]>([]);
  readonly loading = signal(false);
  readonly message = signal('');
  readonly editingId = signal<number | null>(null);
  readonly options = signal<Record<string, ResourceOption[]>>({});
  form = this.formBuilder.group({});

  constructor(private readonly userMsService: UserMsService) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadOptions();
    this.load();
  }

  columns(): string[] {
    const first = this.rows()[0];
    return first ? Object.keys(first).slice(0, 8) : ['id', ...this.activeResource().fields.map((field) => field.key)];
  }

  selectResource(resource: ResourceConfig): void {
    this.activeResource.set(resource);
    this.resetForm();
    this.loadOptions();
    this.load();
  }

  optionsFor(source?: string): ResourceOption[] {
    return source ? this.options()[source] ?? [] : [];
  }

  load(): void {
    this.loading.set(true);
    this.userMsService.list(this.activeResource().endpoint).subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.message.set('No fue posible cargar los datos. Verifica login y servicio User_MS.');
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
      ? this.userMsService.update(this.activeResource().endpoint, this.editingId() as number, payload)
      : this.userMsService.create(this.activeResource().endpoint, payload);
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
      group[field.key] = [field.type === 'multiselect' ? [] : '', field.required ? [Validators.required] : []];
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

  private loadOptions(): void {
    const sources = Array.from(new Set(this.activeResource().fields.map((field) => field.optionSource).filter(Boolean))) as string[];
    if (!sources.length) {
      this.options.set({});
      return;
    }

    const requests = sources.reduce<Record<string, Observable<EntityRecord[]>>>((acc, source) => {
      acc[source] = this.userMsService.list(source);
      return acc;
    }, {});

    forkJoin(requests).subscribe({
      next: (result) => {
        const options = sources.reduce<Record<string, ResourceOption[]>>((acc, source) => {
          acc[source] = result[source].map((record) => ({
            value: String(record['id']),
            label: this.optionLabel(record)
          }));
          return acc;
        }, {});
        this.options.set(options);
      },
      error: () => {
        this.options.set({});
        this.message.set('No fue posible cargar las listas relacionadas.');
      }
    });
  }

  private optionLabel(record: EntityRecord): string {
    const id = record['id'];
    const label = record['name'] ?? record['description'] ?? record['code'] ?? record['period'] ?? record['year'] ?? id;
    const code = record['code'] && record['code'] !== label ? ` - ${record['code']}` : '';
    return `${label}${code}`;
  }
}
