import { InputAtom } from '../../../../../../shared/ui/atoms/input/input.directive';
import { ButtonAtom } from '../../../../../../shared/ui/atoms/button/button.directive';
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserGateway as UserApiService } from '../../../../application/ports/user-api.service.port';
import { Period } from '../../../../domain/models/abet.models';

interface PeriodRow { code: string; name: string; semester: string; year: string; }

@Component({
  selector: 'app-periodos',
  standalone: true,
  imports: [InputAtom, ButtonAtom, CommonModule, FormsModule],
  templateUrl: './periodos.component.html',
  styleUrl: './periodos.component.scss'
})
export class PeriodosComponent implements OnInit {
  showForm = signal(false);
  loading = signal(true);
  error   = signal<string | null>(null);
  saving  = signal(false);
  formError = signal<string | null>(null);
  periods = signal<PeriodRow[]>([]);

  newYear = ''; newPeriod = '';

  private periodList: Period[] = [];

  constructor(private users: UserApiService) {}

  ngOnInit(): void { this.load(); }

  private load(): void {
    this.loading.set(true);
    // El modelo v13 tiene un único catálogo Period (id, code).
    this.users.getPeriods().subscribe({
      next: (periods) => {
        this.periodList = periods ?? [];
        this.periods.set(this.mapRows(this.periodList));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los períodos. Verifica la conexión con el servidor.');
        this.loading.set(false);
      },
    });
  }

  private mapRows(periods: Period[]): PeriodRow[] {
    // Period v13 solo tiene code; el año y el semestre se derivan del código.
    return periods.map(p => {
      const code = p.code ?? '';
      const yearStr = code.slice(0, 4);
      const periodStr = code.slice(4);
      return { code, name: code, semester: periodStr, year: yearStr };
    });
  }

  addPeriod(): void {
    this.formError.set(null);
    const yearNum = parseInt(this.newYear, 10);
    if (!yearNum || !this.newPeriod.trim()) {
      this.formError.set('Indica año y semestre.');
      return;
    }
    this.saving.set(true);
    const period = this.newPeriod.trim();
    // createPeriod({ code }) crea el Period con el código año+semestre (ej. 202610).
    const code = `${yearNum}${period}`;
    this.users.createPeriod({ code }).subscribe({
      next: () => {
        this.newYear = ''; this.newPeriod = '';
        this.showForm.set(false);
        this.saving.set(false);
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.formError.set('No se pudo crear el período. Revisa los datos e intenta de nuevo.');
      },
    });
  }
}
