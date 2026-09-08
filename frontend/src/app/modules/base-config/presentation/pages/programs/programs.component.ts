import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { BaseConfigUseCase } from '../../../application/use-cases/base-config.usecase';
import { AcademicProgram } from '../../../domain/models/base-config.models';
import { BadgeComponent } from '../../../../../shared/ui/atoms/badge/badge.component';
import { ButtonComponent } from '../../../../../shared/ui/atoms/button/button.component';
import { CardComponent } from '../../../../../shared/ui/atoms/card/card.component';

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
  templateUrl: './programs.component.html',
  styleUrl: './programs.component.scss'
})
export class ProgramsComponent implements OnInit {
  private readonly baseConfig = inject(BaseConfigUseCase);
  readonly editingId = signal<number | null>(null);
  readonly programs = signal<AcademicProgram[]>([
    { id: 1, name: 'Ingenieria de Sistemas', code: 'IS', accreditation: 'Acreditado ABET vigente 2024-2030', progress: 88, status: 'acreditado' },
    { id: 2, name: 'Ingenieria Industrial', code: 'II', accreditation: 'En proceso de acreditacion', progress: 74, status: 'en-proceso' },
    { id: 3, name: 'Ingenieria Biomedica', code: 'IB', accreditation: 'Acreditado ABET vigente 2023-2029', progress: 81, status: 'acreditado' },
    { id: 4, name: 'Ingenieria Mecatronica', code: 'IM', accreditation: 'Autoevaluacion inicial', progress: 68, status: 'evaluacion' }
  ]);
  draft: AcademicProgram = { ...EMPTY_PROGRAM };

  ngOnInit(): void {
    this.baseConfig.gateway.careers().subscribe({
      next: (careers) => {
        if (!careers.length) {
          return;
        }
        this.programs.set(careers.map((career, index) => ({
          id: career.id,
          name: career.name,
          code: career.code,
          accreditation: career.description || 'Configuracion base del programa academico',
          progress: [88, 74, 81, 68, 79][index % 5],
          status: index % 3 === 0 ? 'acreditado' : index % 3 === 1 ? 'en-proceso' : 'evaluacion'
        })));
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
    const normalized = { ...this.draft, progress: Math.max(0, Math.min(100, Number(this.draft.progress) || 0)) };
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

  badgeTone(status: AcademicProgram['status']): 'success' | 'warning' | 'secondary' {
    return status === 'acreditado' ? 'success' : status === 'evaluacion' ? 'secondary' : 'warning';
  }

  labelFor(status: AcademicProgram['status']): string {
    return status === 'acreditado' ? 'Acreditado' : status === 'evaluacion' ? 'Evaluacion' : 'En proceso';
  }
}
