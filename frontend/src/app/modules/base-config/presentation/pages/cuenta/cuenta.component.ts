import { InputAtom } from '../../../../../shared/ui/atoms/input/input.directive';
import { ButtonAtom } from '../../../../../shared/ui/atoms/button/button.directive';
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../../auth/application/services/auth.service';
import { UserGateway as UserApiService } from '../../../application/ports/user-api.service.port';
import { LEGAL } from '../legal/legal.config';
import { LegalFooterComponent } from '../../../../../shared/ui/molecules/legal-footer/legal-footer.component';

/** Reglas alineadas con la política del backend (password_policy.py). */
function strongPassword(c: AbstractControl): ValidationErrors | null {
  const v: string = c.value ?? '';
  if (!v) return null;
  if (v.length < 10) return { short: true };
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return { mix: true };
  return null;
}

@Component({
  selector: 'app-cuenta',
  standalone: true,
  imports: [InputAtom, ButtonAtom, CommonModule, ReactiveFormsModule, RouterLink, LegalFooterComponent],
  templateUrl: './cuenta.component.html',
  styleUrl: './cuenta.component.scss',
})
export class CuentaComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private api = inject(UserApiService);

  user = this.auth.user;
  contacto = LEGAL.correoDatos;
  loading = signal(false);
  ok = signal(false);
  error = signal('');

  form = this.fb.nonNullable.group({
    current: ['', Validators.required],
    next: ['', [Validators.required, strongPassword]],
    again: ['', Validators.required],
  });

  home(): string {
    const r = this.auth.role();
    return r === 'Profesor' ? '/profesor/dashboard' : r === 'Administrativo' ? '/admin/dashboard' : r === 'Auditor' ? '/auditor/dashboard' : '/coordinador/dashboard';
  }

  submit(): void {
    this.ok.set(false); this.error.set('');
    this.form.markAllAsTouched();
    const { current, next, again } = this.form.getRawValue();
    if (this.form.invalid || next !== again) return;
    this.loading.set(true);
    this.api.changeMyPassword(current, next).subscribe({
      next: () => { this.loading.set(false); this.ok.set(true); this.form.reset(); },
      error: (e: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(typeof e.error?.detail === 'string' ? e.error.detail : 'No se pudo cambiar la contraseña.');
      },
    });
  }
}
