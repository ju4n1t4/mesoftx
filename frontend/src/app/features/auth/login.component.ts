import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ButtonComponent } from '../../shared/atoms/button/button.component';
import { CardComponent } from '../../shared/atoms/card/card.component';
import { InputComponent } from '../../shared/atoms/input/input.component';
import { FormFieldComponent } from '../../shared/molecules/form-field/form-field.component';

@Component({
  selector: 'mx-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, CardComponent, InputComponent, FormFieldComponent],
  template: `
    <main class="login">
      <section class="hero">
        <div class="mark">M</div>
        <h1>MESOFTX</h1>
        <p>Gestion de valoracion ABET para programas de ingenieria UNAB.</p>
      </section>
      <mx-card>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <span class="eyebrow">Acceso institucional</span>
          <h2>Iniciar sesion</h2>
          <mx-form-field label="Correo">
            <mx-input formControlName="email" placeholder="admin@example.com" />
          </mx-form-field>
          <mx-form-field label="Password">
            <mx-input formControlName="password" type="password" placeholder="********" />
          </mx-form-field>
          <p class="error" *ngIf="error">{{ error }}</p>
          <mx-button type="submit" [disabled]="form.invalid || loading">{{ loading ? 'Validando...' : 'Ingresar' }}</mx-button>
        </form>
      </mx-card>
    </main>
  `,
  styles: [`
    .login {
      align-items: center;
      background: radial-gradient(circle at top left, rgba(255,165,2,.18), transparent 32%), var(--mx-ink);
      display: grid;
      gap: 34px;
      grid-template-columns: minmax(0, 1fr) 410px;
      min-height: 100vh;
      padding: 48px;
    }
    .hero { color: #fff; max-width: 620px; }
    .mark {
      align-items: center;
      background: var(--mx-primary);
      border-radius: 18px;
      color: var(--mx-ink);
      display: flex;
      font: 900 54px Inter, system-ui, sans-serif;
      height: 88px;
      justify-content: center;
      width: 88px;
    }
    h1 { font: 900 58px Inter, system-ui, sans-serif; letter-spacing: 0; margin: 24px 0 10px; }
    .hero p { color: #c9cdd6; font: 500 18px/1.6 Inter, system-ui, sans-serif; }
    form { display: grid; gap: 16px; }
    .eyebrow { color: var(--mx-primary); font: 800 12px Inter, system-ui, sans-serif; text-transform: uppercase; }
    h2 { color: var(--mx-ink); font: 800 28px Inter, system-ui, sans-serif; margin: 0; }
    .error { background: #fee2e2; border-radius: 8px; color: var(--mx-danger); font: 700 12px Inter, system-ui, sans-serif; padding: 10px 12px; }
    @media (max-width: 840px) {
      .login { grid-template-columns: 1fr; padding: 24px; }
    }
  `]
})
export class LoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  loading = false;
  error = '';
  form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  submit(): void {
    if (this.form.invalid || this.loading) {
      return;
    }
    this.loading = true;
    this.error = '';
    const { email, password } = this.form.getRawValue();
    this.authService.login(email, password).subscribe({
      next: () => void this.router.navigateByUrl('/dashboard'),
      error: () => {
        this.error = 'Credenciales invalidas o servicio no disponible.';
        this.loading = false;
      }
    });
  }
}
