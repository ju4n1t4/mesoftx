import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';

import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

import { AssesmentApiService } from '../../../core/services/assesment-api.service';
import { UserApiService } from '../../../core/services/user-api.service';
import { StudentOutcome, Performance, Level, College } from '../../../core/models/abet.models';

/** Los 4 niveles fijos de la rúbrica, por rank. El sufijo forma el id propuesto. */
const LEVEL_DEFS: { rank: number; name: string; suffix: string }[] = [
  { rank: 1, name: 'Insatisfactorio',          suffix: 'INSATISFACTORIO' },
  { rank: 2, name: 'En desarrollo',            suffix: 'EN DESARROLLO' },
  { rank: 3, name: 'Bueno',                    suffix: 'BUENO' },
  { rank: 4, name: 'Supera las expectativas',  suffix: 'SUPERA LAS EXPECTATIVAS' },
];

/** Vista en árbol: un indicador con sus niveles ya ordenados por rank. */
interface PerfNode { perf: Performance; levels: Level[]; }
/** Vista en árbol: un SO con sus indicadores. */
interface SoNode { so: StudentOutcome; performances: PerfNode[]; }

@Component({
  selector: 'app-student-outcomes',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    AccordionModule, ButtonModule, DialogModule, InputTextModule, InputTextarea,
    SelectModule, TagModule, ToastModule, ProgressSpinnerModule, ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast></p-toast>
    <p-confirmDialog></p-confirmDialog>

    <div class="content-area">
      <div class="page-header">
        <h1>Parametrización de la rúbrica</h1>
        <p>Crea los Student Outcomes, sus indicadores de desempeño y los 4 niveles de logro de cada uno. Es exactamente la rúbrica que verá el profesor al valorar.</p>
      </div>

      <div class="toolbar">
        <button pButton type="button" label="Nuevo student outcome" icon="pi pi-plus" (click)="openSoForm()"></button>
      </div>

      <div class="loading-wrap" *ngIf="loading()">
        <p-progressSpinner strokeWidth="4" [style]="{ width: '40px', height: '40px' }"></p-progressSpinner>
      </div>

      <ng-container *ngIf="!loading()">
        <!-- Estado vacío -->
        <div class="empty-card" *ngIf="tree().length === 0">
          <i class="pi pi-inbox"></i>
          <div class="empty-title">Aún no hay Student Outcomes</div>
          <div class="empty-desc">Crea el primero con el botón "Nuevo student outcome" para empezar a parametrizar la rúbrica.</div>
        </div>

        <p-accordion *ngIf="tree().length > 0" [multiple]="true">
          <p-accordionTab *ngFor="let node of tree()">
            <ng-template pTemplate="header">
              <div class="so-head">
                <span class="so-badge">{{ node.so.id }}</span>
                <span class="so-desc">{{ node.so.description }}</span>
                <p-tag *ngIf="node.performances.length === 0" severity="warn"
                       value="Sin indicadores: no se puede valorar"></p-tag>
              </div>
            </ng-template>

            <div class="so-actions">
              <button pButton type="button" label="Añadir indicador" icon="pi pi-plus"
                      class="p-button-sm p-button-text" (click)="openPerfForm(node.so)"></button>
              <button pButton type="button" label="Editar SO" icon="pi pi-pencil"
                      class="p-button-sm p-button-text" (click)="openSoForm(node.so)"></button>
              <button pButton type="button" label="Borrar SO" icon="pi pi-trash"
                      class="p-button-sm p-button-text p-button-danger" (click)="confirmDeleteSo(node)"></button>
            </div>

            <div class="perf-empty" *ngIf="node.performances.length === 0">
              Este student outcome no tiene indicadores todavía.
            </div>

            <div class="perf-card" *ngFor="let pn of node.performances">
              <div class="perf-head">
                <span class="perf-id">{{ perfCode(pn.perf) }}</span>
                <span class="perf-desc">{{ pn.perf.description }}</span>
                <p-tag *ngIf="pn.levels.length < 4" severity="warn"
                       [value]="'Faltan ' + (4 - pn.levels.length) + ' niveles'"></p-tag>
                <span class="perf-spacer"></span>
                <button pButton type="button" icon="pi pi-plus" label="Completar niveles"
                        *ngIf="pn.levels.length < 4"
                        class="p-button-sm p-button-text" (click)="openCompleteLevels(node.so, pn)"></button>
                <button pButton type="button" icon="pi pi-pencil"
                        class="p-button-sm p-button-text" (click)="openPerfForm(node.so, pn.perf)"></button>
                <button pButton type="button" icon="pi pi-trash"
                        class="p-button-sm p-button-text p-button-danger" (click)="confirmDeletePerf(node, pn)"></button>
              </div>
              <div class="level-row" *ngFor="let lv of pn.levels">
                <span class="level-rank">{{ lv.rank }}</span>
                <span class="level-name">{{ levelName(lv.rank) }}</span>
                <span class="level-text">{{ lv.description }}</span>
              </div>
            </div>
          </p-accordionTab>
        </p-accordion>
      </ng-container>

      <!-- ── Diálogo Student Outcome ── -->
      <p-dialog [(visible)]="soDialog" [modal]="true" [style]="{ width: '520px' }"
                [header]="editingSo() ? 'Editar student outcome' : 'Nuevo student outcome'">
        <form [formGroup]="soForm" class="dialog-form">
          <label>Identificador
            <input pInputText formControlName="id" maxlength="5" />
            <small class="hint">Propuesto; puedes cambiarlo. Máx 5 caracteres.</small>
            <small class="err" *ngIf="soForm.controls['id'].invalid && soForm.controls['id'].touched">Requerido (máx 5).</small>
          </label>
          <label>Descripción
            <textarea pInputTextarea formControlName="description" rows="3" maxlength="255"></textarea>
            <small class="err" *ngIf="soForm.controls['description'].invalid && soForm.controls['description'].touched">Requerida (máx 255).</small>
          </label>
          <label>Facultad
            <p-select formControlName="college_id" [options]="activeColleges()" optionLabel="name" optionValue="id"
                      placeholder="Selecciona la facultad" appendTo="body"></p-select>
            <small class="err" *ngIf="soForm.controls['college_id'].invalid && soForm.controls['college_id'].touched">Requerida.</small>
          </label>
        </form>
        <ng-template pTemplate="footer">
          <button pButton type="button" label="Cancelar" class="p-button-text" (click)="soDialog = false"></button>
          <button pButton type="button" [label]="editingSo() ? 'Guardar' : 'Crear'" [disabled]="saving()" (click)="saveSo()"></button>
        </ng-template>
      </p-dialog>

      <!-- ── Diálogo Indicador (con sus 4 niveles) ── -->
      <p-dialog [(visible)]="perfDialog" [modal]="true" [style]="{ width: '680px' }"
                [header]="perfDialogHeader()">
        <form [formGroup]="perfForm" class="dialog-form">
          <div class="grid-2">
            <label>ID del indicador
              <input pInputText formControlName="id" maxlength="3" />
              <small class="err" *ngIf="perfForm.controls['id'].invalid && perfForm.controls['id'].touched">Requerido (máx 3).</small>
            </label>
            <label>Descripción
              <input pInputText formControlName="description" maxlength="255" />
              <small class="err" *ngIf="perfForm.controls['description'].invalid && perfForm.controls['description'].touched">Requerida.</small>
            </label>
          </div>

          <div class="levels-title" *ngIf="!editingPerf()">Niveles (los 4 son obligatorios)</div>
          <div formArrayName="levels" *ngIf="!editingPerf()">
            <div class="level-form" *ngFor="let ctrl of levelControls; let i = index" [formGroupName]="i">
              <div class="lf-head">
                <span class="lf-rank">{{ ctrl.value.rank }} · {{ ctrl.value.name }}</span>
                <input pInputText class="lf-id" formControlName="id" maxlength="100" />
              </div>
              <textarea pInputTextarea formControlName="description" rows="2" maxlength="255"
                        [placeholder]="'Descriptor de ' + ctrl.value.name"></textarea>
              <small class="err" *ngIf="ctrl.get('description')?.invalid && ctrl.get('description')?.touched">Descriptor obligatorio.</small>
            </div>
          </div>

          <div class="edit-note" *ngIf="editingPerf()">
            Los niveles se editan desde la lista del indicador. Aquí solo cambias su descripción.
          </div>
        </form>
        <ng-template pTemplate="footer">
          <button pButton type="button" label="Cancelar" class="p-button-text" (click)="perfDialog = false"></button>
          <button pButton type="button" [label]="editingPerf() ? 'Guardar' : 'Crear indicador'" [disabled]="saving()" (click)="savePerf()"></button>
        </ng-template>
      </p-dialog>

      <!-- ── Diálogo Completar niveles faltantes ── -->
      <p-dialog [(visible)]="completeDialog" [modal]="true" [style]="{ width: '620px' }"
                header="Completar niveles del indicador">
        <form [formGroup]="completeForm" class="dialog-form">
          <div formArrayName="levels">
            <div class="level-form" *ngFor="let ctrl of completeControls; let i = index" [formGroupName]="i">
              <div class="lf-head">
                <span class="lf-rank">{{ ctrl.value.rank }} · {{ ctrl.value.name }}</span>
                <input pInputText class="lf-id" formControlName="id" maxlength="100" />
              </div>
              <textarea pInputTextarea formControlName="description" rows="2" maxlength="255"
                        [placeholder]="'Descriptor de ' + ctrl.value.name"></textarea>
              <small class="err" *ngIf="ctrl.get('description')?.invalid && ctrl.get('description')?.touched">Descriptor obligatorio.</small>
            </div>
          </div>
        </form>
        <ng-template pTemplate="footer">
          <button pButton type="button" label="Cancelar" class="p-button-text" (click)="completeDialog = false"></button>
          <button pButton type="button" label="Crear niveles" [disabled]="saving()" (click)="saveCompleteLevels()"></button>
        </ng-template>
      </p-dialog>
    </div>
  `,
  styles: [`
    .toolbar { display: flex; justify-content: flex-end; margin-bottom: 16px; }
    .loading-wrap { display: flex; justify-content: center; padding: 40px; }
    .so-head { display: flex; align-items: center; gap: 12px; }
    .so-badge { background: var(--accent); color: #fff; font-weight: 800; font-size: 12px; padding: 4px 10px; border-radius: 8px; }
    .so-desc { font-weight: 600; }
    .so-actions { display: flex; gap: 6px; margin-bottom: 10px; flex-wrap: wrap; }
    .perf-empty, .edit-note { font-size: 13px; color: var(--text-muted); padding: 8px 0; }
    .perf-card { border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px 14px; margin-bottom: 10px; }
    .perf-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .perf-id { font-weight: 700; color: var(--text); }
    .perf-desc { color: var(--text-muted); font-size: 13px; }
    .perf-spacer { flex: 1; }
    .level-row { display: flex; align-items: baseline; gap: 10px; padding: 4px 0; border-top: 1px solid var(--border); }
    .level-rank { width: 18px; font-weight: 700; color: var(--accent); }
    .level-name { width: 170px; font-size: 12px; font-weight: 600; color: var(--text-muted); }
    .level-text { flex: 1; font-size: 13px; }
    .dialog-form { display: flex; flex-direction: column; gap: 14px; padding-top: 6px; }
    .dialog-form label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; font-weight: 600; }
    .dialog-form input, .dialog-form textarea, .dialog-form p-select { width: 100%; }
    .grid-2 { display: grid; grid-template-columns: 120px 1fr; gap: 12px; }
    .hint { font-weight: 400; color: var(--text-muted); }
    .err { color: var(--badge-expired, #DC2626); font-weight: 500; }
    .levels-title { font-size: 13px; font-weight: 700; margin-top: 6px; }
    .level-form { border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px; margin-bottom: 8px; display: flex; flex-direction: column; gap: 6px; }
    .lf-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .lf-rank { font-size: 12px; font-weight: 700; color: var(--text-muted); }
    .lf-id { width: 260px; font-family: monospace; font-size: 12px; }
    .empty-card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 48px 24px; text-align: center; }
    .empty-card i { font-size: 32px; color: var(--text-light); }
    .empty-title { font-size: 15px; font-weight: 700; margin: 12px 0 4px; }
    .empty-desc { font-size: 13px; color: var(--text-muted); max-width: 420px; margin: 0 auto; line-height: 1.6; }
  `],
})
export class StudentOutcomesComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  tree = signal<SoNode[]>([]);
  colleges = signal<College[]>([]);
  activeColleges = computed(() => this.colleges().filter(c => c.active));

  private editingSoId = signal<string | null>(null);
  private editingPerfId = signal<string | null>(null);
  private perfTargetSo = signal<StudentOutcome | null>(null);
  private completeTarget = signal<PerfNode | null>(null);

  editingSo = computed(() => this.editingSoId() !== null);
  editingPerf = computed(() => this.editingPerfId() !== null);
  perfDialogHeader = computed(() =>
    this.editingPerf() ? 'Editar indicador' : `Nuevo indicador del ${this.perfTargetSo()?.id ?? ''}`);

  soDialog = false;
  perfDialog = false;
  completeDialog = false;

  soForm: FormGroup;
  perfForm: FormGroup;
  completeForm: FormGroup;

  constructor(
    private assesment: AssesmentApiService,
    private userApi: UserApiService,
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {
    this.soForm = this.fb.group({
      id: ['', [Validators.required, Validators.maxLength(5)]],
      description: ['', [Validators.required, Validators.maxLength(255)]],
      college_id: ['', [Validators.required]],
    });
    this.perfForm = this.fb.group({
      id: ['', [Validators.required, Validators.maxLength(3)]],
      description: ['', [Validators.required, Validators.maxLength(255)]],
      levels: this.fb.array(LEVEL_DEFS.map(() => this.emptyLevelGroup())),
    });
    this.completeForm = this.fb.group({ levels: this.fb.array([] as FormGroup[]) });
  }

  get levelControls(): FormGroup[] {
    return (this.perfForm.get('levels') as FormArray).controls as FormGroup[];
  }
  get completeControls(): FormGroup[] {
    return (this.completeForm.get('levels') as FormArray).controls as FormGroup[];
  }

  ngOnInit(): void {
    this.reload();
    this.userApi.getColleges().subscribe({ next: c => this.colleges.set(c ?? []), error: () => {} });
  }

  private reload(): void {
    this.loading.set(true);
    this.assesment.getStudentOutcomes().subscribe({
      next: sos => {
        if (!sos?.length) { this.tree.set([]); this.loading.set(false); return; }
        // Para cada SO cargamos sus indicadores; para cada indicador, sus niveles.
        forkJoin(sos.map(so => this.assesment.getPerformances(so.id))).subscribe({
          next: perfsBySo => {
            const allPerfs = perfsBySo.flat();
            const levels$ = allPerfs.length
              ? forkJoin(allPerfs.map(p => this.assesment.getLevels(p.id)))
              : of([] as Level[][]);
            levels$.subscribe({
              next: levelsByPerf => {
                const levelMap = new Map<string, Level[]>();
                allPerfs.forEach((p, i) => {
                  const lv = [...(levelsByPerf[i] ?? [])].sort((a, b) => a.rank - b.rank);
                  levelMap.set(p.id, lv);
                });
                const nodes: SoNode[] = sos.map((so, i) => ({
                  so,
                  performances: (perfsBySo[i] ?? []).map(perf => ({ perf, levels: levelMap.get(perf.id) ?? [] })),
                }));
                this.tree.set(nodes);
                this.loading.set(false);
              },
              error: e => this.fail(e),
            });
          },
          error: e => this.fail(e),
        });
      },
      error: e => this.fail(e),
    });
  }

  private fail(err: HttpErrorResponse): void {
    this.loading.set(false);
    this.showError(err);
  }

  levelName(rank: number): string {
    return LEVEL_DEFS.find(d => d.rank === rank)?.name ?? '';
  }

  perfCode(perf: Performance): string {
    return perf.code || perf.id;
  }

  // ── Student Outcome ───────────────────────────────────────
  openSoForm(so?: StudentOutcome): void {
    if (so) {
      this.editingSoId.set(so.id);
      this.soForm.reset({ id: so.id, description: so.description, college_id: so.college_id });
      this.soForm.controls['id'].disable();
    } else {
      this.editingSoId.set(null);
      this.soForm.reset({ id: this.nextSoId(), description: '', college_id: this.activeColleges()[0]?.id ?? '' });
      this.soForm.controls['id'].enable();
    }
    this.soDialog = true;
  }

  saveSo(): void {
    if (this.soForm.invalid) { this.soForm.markAllAsTouched(); return; }
    this.saving.set(true);
    const raw = this.soForm.getRawValue();
    const editing = this.editingSoId();
    const req = editing
      ? this.assesment.updateStudentOutcome(editing, { description: raw.description, college_id: raw.college_id })
      : this.assesment.createStudentOutcome({ id: String(raw.id).trim().toUpperCase(), description: raw.description, college_id: raw.college_id });
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.soDialog = false;
        this.messageService.add({ severity: 'success', summary: 'Student outcome', detail: editing ? 'Actualizado.' : 'Creado.' });
        this.reload();
      },
      error: e => { this.saving.set(false); this.showError(e); },
    });
  }

  private nextSoId(): string {
    const used = new Set(this.tree().map(node => node.so.id.trim().toUpperCase()));
    let i = this.tree().length + 1;
    while (used.has(`S.O.${i}`)) i++;
    return `S.O.${i}`;
  }

  confirmDeleteSo(node: SoNode): void {
    const n = node.performances.length;
    const nLevels = node.performances.reduce((acc, p) => acc + p.levels.length, 0);
    this.confirmationService.confirm({
      header: 'Borrar student outcome',
      message: `Borrar ${node.so.id} eliminará sus ${n} indicadores, sus ${nLevels} niveles y todas las valoraciones asociadas. Esta acción no se puede deshacer.`,
      acceptLabel: 'Borrar', rejectLabel: 'Cancelar',
      accept: () => {
        this.assesment.deleteStudentOutcome(node.so.id).subscribe({
          next: () => { this.messageService.add({ severity: 'success', summary: 'Borrado', detail: `${node.so.id} eliminado.` }); this.reload(); },
          error: e => this.showError(e),  // 409: se muestra el detail y la fila permanece (no recargamos)
        });
      },
    });
  }

  // ── Indicador ─────────────────────────────────────────────
  private emptyLevelGroup(index = 0): FormGroup {
    const def = LEVEL_DEFS[index];
    return this.fb.group({
      rank: [def.rank],
      name: [def.name],
      suffix: [def.suffix],
      id: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.maxLength(255)]],
    });
  }

  openPerfForm(so: StudentOutcome, perf?: Performance): void {
    this.perfTargetSo.set(so);
    const levels = this.perfForm.get('levels') as FormArray;
    if (perf) {
      this.editingPerfId.set(perf.id);
      this.perfForm.reset({ id: this.perfCode(perf), description: perf.description });
      this.perfForm.controls['id'].disable();
    } else {
      this.editingPerfId.set(null);
      const node = this.tree().find(t => t.so.id === so.id);
      const proposedPerfId = `ID${(node?.performances.length ?? 0) + 1}`;
      this.perfForm.controls['id'].enable();
      this.perfForm.patchValue({ id: proposedPerfId, description: '' });
      // Rellena los 4 grupos de nivel con ids propuestos {so}{perf}{SUFIJO}.
      LEVEL_DEFS.forEach((def, i) => {
        levels.at(i).patchValue({
          rank: def.rank, name: def.name, suffix: def.suffix,
          id: `${so.id}${proposedPerfId}${def.suffix}`, description: '',
        });
      });
      // Reencadena la propuesta del id de nivel cuando cambia el id del indicador.
      this.perfForm.controls['id'].valueChanges.subscribe((pid: string) => {
        if (this.editingPerf()) return;
        LEVEL_DEFS.forEach((def, i) => levels.at(i).patchValue({ id: `${so.id}${pid}${def.suffix}` }, { emitEvent: false }));
      });
    }
    this.perfDialog = true;
  }

  savePerf(): void {
    const so = this.perfTargetSo();
    if (!so) return;
    const editing = this.editingPerfId();

    if (editing) {
      if (this.perfForm.controls['description'].invalid) { this.perfForm.markAllAsTouched(); return; }
      this.saving.set(true);
      this.assesment.updatePerformance(editing, { description: this.perfForm.getRawValue().description }).subscribe({
        next: () => { this.saving.set(false); this.perfDialog = false; this.messageService.add({ severity: 'success', summary: 'Indicador', detail: 'Actualizado.' }); this.reload(); },
        error: e => { this.saving.set(false); this.showError(e); },
      });
      return;
    }

    // Crear: valida indicador + los 4 descriptores (obligatorios).
    if (this.perfForm.invalid) {
      this.perfForm.markAllAsTouched();
      this.messageService.add({ severity: 'warn', summary: 'Faltan datos', detail: 'Completa el indicador y los 4 descriptores de nivel.' });
      return;
    }
    this.saving.set(true);
    const raw = this.perfForm.getRawValue();
    this.assesment.createPerformance({ id: raw.id, description: raw.description, so_id: so.id }).subscribe({
      next: created => {
        // Indicador creado: ahora los 4 niveles. Si alguno falla, se informa y
        // el indicador queda visible con aviso "faltan N niveles".
        const levelBodies = (raw.levels as { id: string; description: string; rank: number }[]).map(l => ({
          id: l.id, description: l.description, rank: l.rank, performance_id: created.id,
        }));
        forkJoin(levelBodies.map(b => this.assesment.createLevel(b).pipe())).subscribe({
          next: () => { this.saving.set(false); this.perfDialog = false; this.messageService.add({ severity: 'success', summary: 'Indicador', detail: 'Indicador y 4 niveles creados.' }); this.reload(); },
          error: () => { this.saving.set(false); this.perfDialog = false; this.messageService.add({ severity: 'warn', summary: 'Niveles incompletos', detail: 'El indicador se creó pero algún nivel falló. Usa "Completar niveles" para terminarlo.' }); this.reload(); },
        });
      },
      error: e => { this.saving.set(false); this.showError(e); },
    });
  }

  confirmDeletePerf(node: SoNode, pn: PerfNode): void {
    this.confirmationService.confirm({
      header: 'Borrar indicador',
      message: `Borrar ${this.perfCode(pn.perf)} eliminará sus ${pn.levels.length} niveles y las valoraciones asociadas. Esta acción no se puede deshacer.`,
      acceptLabel: 'Borrar', rejectLabel: 'Cancelar',
      accept: () => {
        this.assesment.deletePerformance(pn.perf.id).subscribe({
          next: () => { this.messageService.add({ severity: 'success', summary: 'Borrado', detail: `${this.perfCode(pn.perf)} eliminado.` }); this.reload(); },
          error: e => this.showError(e),
        });
      },
    });
  }

  // ── Completar niveles faltantes ───────────────────────────
  openCompleteLevels(so: StudentOutcome, pn: PerfNode): void {
    this.completeTarget.set(pn);
    const existingRanks = new Set(pn.levels.map(l => l.rank));
    const missing = LEVEL_DEFS.filter(d => !existingRanks.has(d.rank));
    const arr = this.completeForm.get('levels') as FormArray;
    arr.clear();
    missing.forEach(def => arr.push(this.fb.group({
      rank: [def.rank], name: [def.name], suffix: [def.suffix],
      id: [`${so.id}${this.perfCode(pn.perf)}${def.suffix}`, [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.maxLength(255)]],
    })));
    this.completeDialog = true;
  }

  saveCompleteLevels(): void {
    const pn = this.completeTarget();
    if (!pn) return;
    if (this.completeForm.invalid) { this.completeForm.markAllAsTouched(); return; }
    this.saving.set(true);
    const rows = (this.completeForm.getRawValue().levels as { id: string; description: string; rank: number }[]);
    forkJoin(rows.map(l => this.assesment.createLevel({ id: l.id, description: l.description, rank: l.rank, performance_id: pn.perf.id }))).subscribe({
      next: () => { this.saving.set(false); this.completeDialog = false; this.messageService.add({ severity: 'success', summary: 'Niveles', detail: 'Niveles completados.' }); this.reload(); },
      error: e => { this.saving.set(false); this.showError(e); this.reload(); },
    });
  }

  // ── Errores ───────────────────────────────────────────────
  private showError(err: HttpErrorResponse): void {
    const detail = typeof err.error?.detail === 'string' ? err.error.detail : 'Ocurrió un error inesperado';
    this.messageService.add({ severity: 'error', summary: `Error ${err.status}`, detail });
  }
}

