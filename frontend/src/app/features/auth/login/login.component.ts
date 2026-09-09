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

          <!-- Botón Google -->
          <button class="btn-google" type="button" (click)="loginWithGoogle()">
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
              <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continuar con Google
          </button>
          <p class="google-hint">Usa tu cuenta institucional autorizada.</p>

          <!-- Divisor -->
          <div class="divider"><span>o continúa con correo</span></div>

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
                <a href="#" class="forgot-link" (click)="$event.preventDefault()">Olvidé mi contraseña</a>
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

          <!-- Demo -->
          <div class="demo-wrap">
            <div class="demo-divider"><span>Acceso de demostración</span></div>
            <div class="demo-btns">
              <button class="btn-demo" (click)="demoDocente()">
                <i class="pi pi-user"></i> Entrar como Docente
              </button>
              <button class="btn-demo accent" (click)="demoCoordinador()">
                <i class="pi pi-shield"></i> Entrar como Coordinador
              </button>
            </div>
          </div>
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

    /* Google button */
    .btn-google {
      width: 100%; padding: 12px 20px;
      background: #fff; border: 1px solid var(--border); border-radius: var(--radius-sm);
      display: flex; align-items: center; justify-content: center; gap: 10px;
      font-size: 14px; font-weight: 600; color: var(--text);
      cursor: pointer; font-family: inherit; transition: border-color 0.15s, box-shadow 0.15s;
      margin-bottom: 8px;
    }
    .btn-google:hover { border-color: #aaa; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    .google-hint { text-align: center; font-size: 12px; color: var(--text-muted); margin-bottom: 16px; }

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

    /* Demo */
    .demo-wrap { margin-top: 24px; }
    .demo-divider {
      display: flex; align-items: center; gap: 12px; margin-bottom: 14px;
    }
    .demo-divider::before, .demo-divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
    .demo-divider span { font-size: 12px; color: var(--text-muted); white-space: nowrap; }
    .demo-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .btn-demo {
      padding: 10px 14px; border-radius: var(--radius-sm);
      border: 1px solid var(--border); background: #fff; color: var(--text);
      font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit;
      display: flex; align-items: center; justify-content: center; gap: 7px;
      transition: all 0.15s;
    }
    .btn-demo:hover { border-color: var(--primary); color: var(--primary); }
    .btn-demo.accent { border-color: rgba(124,58,237,0.3); color: var(--accent); }
    .btn-demo.accent:hover { background: rgba(124,58,237,0.05); }

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
      error: () => {
        this.loading.set(false);
        this.errorMsg.set('Correo o contraseña incorrectos.');
      },
    });
  }

  togglePass()      { this.showPass.set(!this.showPass()); }
  loginWithGoogle() { alert('Integración Google Workspace pendiente de configuración OAuth.'); }
  demoDocente()     { this.auth.loginAsDocente(); }
  demoCoordinador() { this.auth.loginAsCoordinador(); }
}
