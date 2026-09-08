import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { BaseConfigUseCase } from '../../../application/use-cases/base-config.usecase';
import { AcademicProgram, CareerRecord } from '../../../domain/models/base-config.models';
import { BadgeComponent } from '../../../../../shared/ui/atoms/badge/badge.component';
import { ButtonComponent } from '../../../../../shared/ui/atoms/button/button.component';
import { CardComponent } from '../../../../../shared/ui/atoms/card/card.component';

const EMPTY_PROGRAM: AcademicProgram = {
  id: 0,
  name: '',
  code: '',
  faculty_id: 1,
  description: '',
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
    { id: 1, name: 'Ingenieria de Sistemas', code: 'IS', faculty_id: 1, description: '', accreditation: 'Acreditado ABET vigente 2024-2030', progress: 88, status: 'acreditado' },
    { id: 2, name: 'Ingenieria Industrial', code: 'II', faculty_id: 1, description: '', accreditation: 'En proceso de acreditacion', progress: 74, status: 'en-proceso' },
    { id: 3, name: 'Ingenieria Biomedica', code: 'IB', faculty_id: 1, description: '', accreditation: 'Acreditado ABET vigente 2023-2029', progress: 81, status: 'acreditado' },
    { id: 4, name: 'Ingenieria Mecatronica', code: 'IM', faculty_id: 1, description: '', accreditation: 'Autoevaluacion inicial', progress: 68, status: 'evaluacion' }
  ]);
  readonly message = signal('');
  draft: AcademicProgram = { ...EMPTY_PROGRAM };

  ngOnInit(): void {
    this.baseConfig.gateway.careers().subscribe({
      next: (careers) => {
        if (!careers.length) {
          return;
        }
        this.programs.set(careers.map((career) => ({
          ...this.fromCareer(career)
        })));
      },
      error: () => this.message.set('No fue posible consultar programas en User_MS.')
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
      this.baseConfig.gateway.updateCareer(editingId, normalized).subscribe({
        next: (updated) => this.replaceProgram(updated),
        error: () => this.message.set('No fue posible actualizar el programa en User_MS.')
      });
      return;
    }
    this.baseConfig.gateway.createCareer(normalized).subscribe({
      next: (created) => this.replaceProgram(created),
      error: () => this.message.set('No fue posible crear el programa en User_MS.')
    });
  }

  deleteProgram(id: number): void {
    this.baseConfig.gateway.deleteCareer(id).subscribe({
      next: () => this.programs.update((items) => items.filter((item) => item.id !== id)),
      error: () => this.message.set('No fue posible eliminar el programa en User_MS.')
    });
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

  private replaceProgram(program: CareerRecord): void {
    const mapped = this.fromCareer(program);
    this.programs.update((items) => items.some((item) => item.id === mapped.id) ? items.map((item) => item.id === mapped.id ? mapped : item) : [...items, mapped]);
    this.newProgram();
  }

  private fromCareer(career: CareerRecord): AcademicProgram {
    return {
      id: career.id,
      name: career.name,
      code: career.code,
      faculty_id: career.faculty_id,
      description: career.description,
      accreditation: career.accreditation || career.description || 'Configuracion base del programa academico',
      progress: career.progress ?? 0,
      status: career.status ?? 'en-proceso'
    };
  }
}
