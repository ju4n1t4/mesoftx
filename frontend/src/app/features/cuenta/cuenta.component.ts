import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { UserApiService } from '../../core/services/user-api.service';
import { LEGAL } from '../legal/legal.config';
import { LegalFooterComponent } from '../../shared/legal-footer/legal-footer.component';

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
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LegalFooterComponent],
  template: `
    <div class="ac-page">
      <header class="ac-header">
        <a [routerLink]="home()" class="ac-back"><i class="pi pi-arrow-left"></i> Volver</a>
        <strong>Mi cuenta</strong>
      </header>
      <main class="ac-main">
        <section class="card">
          <h2>Mis datos</h2>
          <dl>
            <dt>Nombre</dt><dd>{{ user()?.name }}</dd>
            <dt>Correo</dt><dd>{{ user()?.email }}</dd>
            <dt>Perfil</dt><dd>{{ user()?.role }}</dd>
          </dl>
          <p class="hint">Para corregir o actualizar estos datos, o para solicitar su supresión, escriba a
            <a [href]="'mailto:' + contacto">{{ contacto }}</a>. Más información en la
            <a routerLink="/legal/privacidad">Política de tratamiento de datos personales</a>.</p>
        </section>

        <section class="card">
          <h2>Cambiar contraseña</h2>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <label>Contraseña actual
              <input type="password" formControlName="current" autocomplete="current-password" />
            </label>
            <label>Nueva contraseña
              <input type="password" formControlName="next" autocomplete="new-password" />
            </label>
            <small class="err" *ngIf="form.get('next')?.touched && form.get('next')?.errors?.['short']">Debe tener al menos 10 caracteres.</small>
            <small class="err" *ngIf="form.get('next')?.touched && form.get('next')?.errors?.['mix']">Debe combinar letras y números.</small>
            <label>Repita la nueva contraseña
              <input type="password" formControlName="again" autocomplete="new-password" />
            </label>
            <small class="err" *ngIf="form.get('again')?.touched && form.value.next !== form.value.again">Las contraseñas no coinciden.</small>
            <div class="msg ok" *ngIf="ok()"><i class="pi pi-check-circle"></i> Contraseña actualizada.</div>
            <div class="msg bad" *ngIf="error()"><i class="pi pi-exclamation-circle"></i> {{ error() }}</div>
            <button type="submit" [disabled]="loading()">{{ loading() ? 'Guardando…' : 'Cambiar contraseña' }}</button>
          </form>
        </section>
      </main>
      <app-legal-footer />
    </div>
  `,
  styles: [`
    .ac-page { min-height: 100vh; display: flex; flex-direction: column; background: var(--page-bg); font-family: 'Inter', sans-serif; }
    .ac-header { background: #fff; border-bottom: 1px solid var(--border); height: 64px; padding: 0 32px; display: flex; align-items: center; gap: 24px; }
    .ac-back { color: var(--text-muted); text-decoration: none; font-size: 14px; display: inline-flex; gap: 6px; align-items: center; }
    .ac-main { flex: 1; max-width: 560px; width: 100%; margin: 0 auto; padding: 32px 16px; display: grid; gap: 20px; align-content: start; }
    .card { background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 24px; }
    h2 { margin: 0 0 14px; font-size: 16px; }
    dl { display: grid; grid-template-columns: 90px 1fr; gap: 6px 12px; font-size: 14px; margin: 0 0 12px; }
    dt { color: var(--text-muted); } dd { margin: 0; font-weight: 600; }
    .hint { font-size: 12.5px; color: var(--text-muted); line-height: 1.6; margin: 0; }
    .hint a { color: var(--primary); font-weight: 600; }
    form { display: grid; gap: 12px; }
    label { display: grid; gap: 6px; font-size: 13px; font-weight: 600; }
    input { height: 40px; border: 1px solid var(--border); border-radius: 8px; padding: 0 12px; font: inherit; }
    input:focus { outline: 2px solid var(--primary); border-color: transparent; }
    button { height: 42px; border: 0; border-radius: 8px; background: var(--primary); color: #1A1A2E; font: 700 14px 'Inter'; cursor: pointer; }
    button:disabled { opacity: .55; cursor: not-allowed; }
    .err { color: #DC2626; font-size: 12px; margin-top: -6px; }
    .msg { display: flex; gap: 8px; align-items: center; font-size: 13px; padding: 10px 12px; border-radius: 8px; }
    .msg.ok { background: rgba(22,163,74,.1); color: #166534; } .msg.bad { background: rgba(220,38,38,.08); color: #991B1B; }
  `],
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
