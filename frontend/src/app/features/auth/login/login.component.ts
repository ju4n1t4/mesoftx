import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="login-page">
      <!-- Panel izquierdo naranja -->
      <div class="login-left">
        <a class="left-logo" routerLink="/" title="Volver al inicio">
          <div class="logo-box">M</div>
          <span class="logo-wordmark">MESOFTX</span>
        </a>
        <div class="left-body">
          <h2>Valoración de Resultados de Aprendizaje ABET</h2>
          <p>Plataforma institucional de la Facultad de Ingeniería · UNAB. Trazable, colaborativa y lista para tu proceso de acreditación.</p>
          <ul class="left-bullets">
            <li><i class="pi pi-check"></i> Acceso con tu correo institucional UNAB</li>
            <li><i class="pi pi-check"></i> Redirección automática según tu rol</li>
            <li><i class="pi pi-check"></i> Dashboards de indicadores en tiempo real</li>
          </ul>
        </div>
      </div>

      <!-- Panel derecho blanco -->
      <div class="login-right">
        <div class="login-card">
          <h1>Bienvenido</h1>
          <p class="login-sub">Ingresa con tu cuenta institucional UNAB para continuar.</p>

          <!-- Error -->
          <div class="error-alert" *ngIf="errorMsg()">
            <i class="pi pi-exclamation-circle"></i> {{ errorMsg() }}
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="form-field">
              <label class="form-label">Correo institucional</label>
              <div class="input-wrap">
                <i class="pi pi-envelope input-icon"></i>
                <input formControlName="email" type="email"
                       class="form-input"
                       placeholder="profesor@unab.edu.co"
                       [class.has-error]="f('email').invalid && f('email').touched" />
              </div>
              <span class="field-err" *ngIf="f('email').invalid && f('email').touched">Ingresa un correo válido.</span>
            </div>

            <div class="form-field">
              <div class="label-row">
                <label class="form-label">Contraseña</label>
                <span class="forgot-link" title="Solicite el restablecimiento al coordinador o al administrador del sistema">¿Olvidó su contraseña? Contacte a su coordinador</span>
              </div>
              <div class="input-wrap">
                <i class="pi pi-lock input-icon"></i>
                <input formControlName="password"
                       [type]="showPass() ? 'text' : 'password'"
                       class="form-input with-btn"
                       placeholder="••••••••"
                       [class.has-error]="f('password').invalid && f('password').touched" />
                <button type="button" class="eye-btn" (click)="togglePass()">
                  <i [class]="'pi ' + (showPass() ? 'pi-eye-slash' : 'pi-eye')"></i>
                </button>
              </div>
              <span class="field-err" *ngIf="f('password').invalid && f('password').touched">La contraseña es obligatoria.</span>
            </div>

            <button type="submit" class="btn-submit" [disabled]="loading()">
              <i class="pi pi-spin pi-spinner" *ngIf="loading()"></i>
              {{ loading() ? 'Verificando…' : 'Iniciar sesión' }}
            </button>
          </form>

          <p class="legal-note">
            Al iniciar sesión usted reconoce que sus datos personales se tratan conforme a la
            <a routerLink="/legal/privacidad">Política de tratamiento de datos personales</a>
            y acepta los <a routerLink="/legal/terminos">Términos de uso</a> de MESOFTX.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      display: flex; height: 100vh;
      font-family: 'Inter', -apple-system, sans-serif;
    }

    /* ── Panel izquierdo ── */
    .login-left {
      width: 420px; min-width: 420px;
      background: var(--primary);
      display: flex; flex-direction: column;
      padding: 40px 44px;
      position: relative; overflow: hidden;
    }
    .login-left::before {
      content: ''; position: absolute;
      top: -80px; right: -80px;
      width: 320px; height: 320px; border-radius: 50%;
      background: rgba(255,255,255,0.12); pointer-events: none;
    }
    .login-left::after {
      content: ''; position: absolute;
      bottom: -100px; left: -60px;
      width: 280px; height: 280px; border-radius: 50%;
      background: rgba(255,255,255,0.07); pointer-events: none;
    }
    .left-logo {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 60px; position: relative; z-index: 1;
      text-decoration: none; cursor: pointer; width: fit-content;
    }
    .logo-box {
      width: 36px; height: 36px; background: #fff; color: var(--primary);
      border-radius: 8px; display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 20px;
    }
    .logo-wordmark { font-weight: 800; font-size: 18px; color: #fff; }
    .left-body {
      margin-top: auto; position: relative; z-index: 1;
    }
    .left-body h2 {
      font-size: 28px; font-weight: 800; color: #fff;
      line-height: 1.25; margin-bottom: 14px;
    }
    .left-body p {
      font-size: 14px; color: rgba(255,255,255,0.85);
      line-height: 1.7; margin-bottom: 24px;
    }
    .left-bullets { list-style: none; display: flex; flex-direction: column; gap: 10px; }
    .left-bullets li {
      display: flex; align-items: center; gap: 10px;
      font-size: 14px; color: rgba(255,255,255,0.92); font-weight: 500;
    }
    .left-bullets .pi-check { font-size: 13px; color: #fff; }

    /* ── Panel derecho ── */
    .login-right {
      flex: 1; background: #F4F5F7;
      display: flex; align-items: center; justify-content: center; padding: 40px;
    }
    .login-card { width: 100%; max-width: 420px; }

    .login-card h1 { font-size: 28px; font-weight: 800; color: var(--text); margin-bottom: 6px; }
    .login-sub { font-size: 14px; color: var(--text-muted); margin-bottom: 24px; }


    /* Divisor */
    .divider {
      display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
    }
    .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
    .divider span { font-size: 12px; color: var(--text-muted); white-space: nowrap; }

    /* Error */
    .error-alert {
      background: var(--n1-bg); border: 1px solid #FECACA; color: var(--n1-color);
      border-radius: var(--radius-sm); padding: 10px 14px; font-size: 13px;
      margin-bottom: 16px; display: flex; align-items: center; gap: 8px;
    }

    /* Formulario */
    .form-field { margin-bottom: 16px; }
    .form-label { display: block; font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
    .label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .forgot-link { font-size: 13px; color: var(--primary); font-weight: 500; }
    .forgot-link:hover { color: var(--primary-dark); }

    .input-wrap { position: relative; display: flex; align-items: center; }
    .input-icon { position: absolute; left: 13px; color: var(--text-light); font-size: 14px; z-index: 1; pointer-events: none; }
    .form-input {
      width: 100%; padding: 11px 14px 11px 38px;
      background: #fff; border: 1px solid var(--border); border-radius: var(--radius-sm);
      font-size: 14px; color: var(--text); font-family: inherit;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .form-input.with-btn { padding-right: 40px; }
    .form-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(255,165,2,0.12); }
    .form-input.has-error { border-color: var(--n1-color); }
    .form-input::placeholder { color: var(--text-light); }
    .eye-btn {
      position: absolute; right: 12px; background: none; border: none;
      color: var(--text-light); cursor: pointer; font-size: 14px; padding: 2px;
      display: flex; align-items: center;
    }
    .eye-btn:hover { color: var(--text-muted); }
    .field-err { font-size: 12px; color: var(--n1-color); margin-top: 4px; display: block; }

    .btn-submit {
      width: 100%; padding: 13px; margin-top: 6px;
      background: var(--primary); color: #1A1A2E;
      border: none; border-radius: var(--radius-sm);
      font-size: 15px; font-weight: 700; cursor: pointer;
      font-family: inherit; transition: background 0.15s;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .btn-submit:hover:not(:disabled) { background: var(--primary-dark); }
    .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

    .legal-note { margin-top: 20px; font-size: 12px; line-height: 1.6; color: var(--text-muted); text-align: center; }
    .legal-note a { color: var(--primary); font-weight: 600; text-decoration: underline; }

    @media (max-width: 700px) { .login-left { display: none; } }
  `]
})
export class LoginComponent {
  form: FormGroup;
  loading  = signal(false);
  errorMsg = signal('');
  showPass = signal(false);

  constructor(private fb: FormBuilder, private auth: AuthService) {
    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  f(name: string) { return this.form.get(name)!; }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.errorMsg.set('');
    const { email, password } = this.form.value;
    this.auth.login(email, password).subscribe({
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 429) {
          this.errorMsg.set('Demasiados intentos fallidos. Espere unos minutos e intente de nuevo.');
        } else if (err?.status === 403) {
          this.errorMsg.set(err?.error?.detail ?? 'Su cuenta no tiene acceso. Contacte al administrador.');
        } else if (err?.status === 0) {
          this.errorMsg.set('No hay conexión con el servidor. Intente más tarde.');
        } else {
          this.errorMsg.set('Correo o contraseña incorrectos.');
        }
      },
    });
  }

  togglePass()      { this.showPass.set(!this.showPass()); }
}
