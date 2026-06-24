import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, NgZone, OnDestroy, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleInitializeConfig) => void;
          renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void;
          cancel: () => void;
        };
      };
    };
  }
}

interface GoogleInitializeConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
}

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleButtonOptions {
  theme: 'outline' | 'filled_blue' | 'filled_black';
  size: 'large' | 'medium' | 'small';
  shape: 'rectangular' | 'pill' | 'circle' | 'square';
  text: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  width: number;
  locale: string;
}

const GOOGLE_SCRIPT_ID = 'google-identity-services';

@Component({
  selector: 'mx-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <main class="login-page">
      <p class="access-label">Acceso · Cuenta Institucional</p>

      <section class="login-shell">
        <aside class="brand-panel">
          <div class="brand">
            <span class="brand-mark">M</span>
            <strong>MESOFTX</strong>
          </div>

          <div class="brand-copy">
            <h1>Valoracion de Resultados de Aprendizaje ABET</h1>
            <p>Plataforma institucional de la Facultad de Ingenieria UNAB. Trazable, colaborativa y lista para tu proceso de acreditacion.</p>
            <ul>
              <li>Acceso con tu correo institucional UNAB</li>
              <li>Redireccion automatica segun tu rol</li>
              <li>Dashboards de indicadores en tiempo real</li>
            </ul>
          </div>
        </aside>

        <section class="form-panel">
          <div class="form-wrap">
            <h2>Bienvenido</h2>
            <p class="subtitle">Ingresa con tu cuenta institucional UNAB para continuar.</p>

            <div class="google-box">
              <div #googleButton class="google-button"></div>
              <button *ngIf="showGoogleFallback" class="google-fallback" type="button" disabled>
                <span class="google-g">G</span>
                Continuar con Google
              </button>
            </div>
            <p class="google-note">{{ googleNote }}</p>

            <div class="divider"><span>o continua con correo</span></div>

            <form [formGroup]="form" (ngSubmit)="submitPasswordLogin()" class="local-form">
              <label>
                <span>Correo institucional</span>
                <input formControlName="email" type="email" placeholder="profesor@unab.edu.co" autocomplete="email">
              </label>

              <label>
                <span>Contrasena</span>
                <div class="password-row">
                  <input formControlName="password" type="password" placeholder="••••••••" autocomplete="current-password">
                  <button type="button" disabled>Olvide mi contrasena</button>
                </div>
              </label>

              <p class="error" *ngIf="error">{{ error }}</p>
              <button class="submit" type="submit" [disabled]="form.invalid || loading">
                {{ loading ? 'Validando...' : 'Iniciar sesion' }}
              </button>
            </form>
          </div>
        </section>
      </section>
    </main>
  `,
  styles: [`
    .login-page {
      background: #eeece7;
      color: #050712;
      min-height: 100vh;
      padding: 22px 8px 8px;
    }
    .access-label {
      color: #98a0b3;
      font: 800 12px Inter, system-ui, sans-serif;
      letter-spacing: 4px;
      margin: 0 0 12px;
      text-transform: uppercase;
    }
    .login-shell {
      background: #fff;
      border-radius: 6px;
      box-shadow: 0 16px 44px rgba(17, 24, 39, .08);
      display: grid;
      grid-template-columns: 500px minmax(0, 1fr);
      min-height: 660px;
      overflow: hidden;
    }
    .brand-panel {
      background: linear-gradient(180deg, #ffa502 0%, #f58400 100%);
      color: #fff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      padding: 46px 44px;
      position: relative;
    }
    .brand-panel::before {
      background: rgba(255, 255, 255, .14);
      border-radius: 50%;
      content: "";
      height: 255px;
      position: absolute;
      right: -58px;
      top: -55px;
      width: 255px;
    }
    .brand-panel::after {
      background: rgba(255, 255, 255, .12);
      border-radius: 50%;
      bottom: -82px;
      content: "";
      height: 240px;
      left: -90px;
      position: absolute;
      width: 240px;
    }
    .brand {
      align-items: center;
      display: flex;
      gap: 12px;
      position: relative;
      z-index: 1;
    }
    .brand-mark {
      align-items: center;
      background: #fff;
      border-radius: 12px;
      color: #f58400;
      display: flex;
      font: 900 26px Inter, system-ui, sans-serif;
      height: 46px;
      justify-content: center;
      width: 46px;
    }
    .brand strong {
      font: 900 20px Inter, system-ui, sans-serif;
    }
    .brand-copy {
      max-width: 390px;
      position: relative;
      z-index: 1;
    }
    .brand-copy h1 {
      font: 900 38px/1.08 Inter, system-ui, sans-serif;
      letter-spacing: 0;
      margin: 0 0 18px;
    }
    .brand-copy p {
      font: 700 14px/1.18 Inter, system-ui, sans-serif;
      margin: 0 0 30px;
    }
    .brand-copy ul {
      display: grid;
      gap: 14px;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .brand-copy li {
      font: 800 14px Inter, system-ui, sans-serif;
    }
    .brand-copy li::before {
      content: "✓";
      margin-right: 12px;
    }
    .form-panel {
      align-items: center;
      display: flex;
      justify-content: center;
      padding: 56px;
    }
    .form-wrap {
      max-width: 588px;
      width: 100%;
    }
    h2 {
      color: #050712;
      font: 900 30px Inter, system-ui, sans-serif;
      margin: 0 0 6px;
    }
    .subtitle {
      color: #7a8190;
      font: 500 15px Inter, system-ui, sans-serif;
      margin: 0 0 26px;
    }
    .google-box {
      min-height: 50px;
      position: relative;
    }
    .google-button {
      min-height: 50px;
      width: 100%;
    }
    .google-button:empty {
      display: none;
    }
    .google-fallback {
      align-items: center;
      background: #fff;
      border: 1.5px solid #dde0e6;
      border-radius: 12px;
      color: #2f3440;
      cursor: not-allowed;
      display: flex;
      font: 800 14px Inter, system-ui, sans-serif;
      gap: 12px;
      justify-content: center;
      min-height: 50px;
      width: 100%;
    }
    .google-g {
      color: #4285f4;
      font: 900 23px Inter, system-ui, sans-serif;
    }
    .google-note {
      color: #98a0b3;
      font: 500 11px Inter, system-ui, sans-serif;
      margin: 10px 0 26px;
      text-align: center;
    }
    .divider {
      align-items: center;
      color: #a3a9b8;
      display: grid;
      font: 800 12px Inter, system-ui, sans-serif;
      gap: 14px;
      grid-template-columns: 1fr auto 1fr;
      margin-bottom: 26px;
    }
    .divider::before,
    .divider::after {
      background: #e8eaf0;
      content: "";
      height: 1px;
    }
    .local-form {
      display: grid;
      gap: 16px;
    }
    label {
      display: grid;
      gap: 8px;
    }
    label > span {
      color: #1c2230;
      font: 800 12px Inter, system-ui, sans-serif;
    }
    input {
      background: #fff;
      border: 1.5px solid #dde0e6;
      border-radius: 12px;
      color: #151823;
      font: 600 14px Inter, system-ui, sans-serif;
      min-height: 46px;
      outline: none;
      padding: 0 16px;
      width: 100%;
    }
    input:focus {
      border-color: #ffa502;
      box-shadow: 0 0 0 3px rgba(255, 165, 2, .14);
    }
    .password-row {
      position: relative;
    }
    .password-row input {
      padding-right: 150px;
    }
    .password-row button {
      background: transparent;
      border: 0;
      color: #ff9800;
      cursor: not-allowed;
      font: 800 12px Inter, system-ui, sans-serif;
      position: absolute;
      right: 14px;
      top: 50%;
      transform: translateY(-50%);
    }
    .submit {
      background: #ffa502;
      border: 0;
      border-radius: 12px;
      box-shadow: 0 14px 24px rgba(255, 165, 2, .24);
      color: #fff;
      cursor: pointer;
      font: 900 15px Inter, system-ui, sans-serif;
      min-height: 50px;
      transition: transform .15s ease, opacity .15s ease;
    }
    .submit:hover:not(:disabled) {
      transform: translateY(-1px);
    }
    .submit:disabled {
      cursor: not-allowed;
      opacity: .55;
    }
    .error {
      background: #fee2e2;
      border-radius: 8px;
      color: #dc2626;
      font: 800 12px Inter, system-ui, sans-serif;
      margin: 0;
      padding: 10px 12px;
    }
    @media (max-width: 980px) {
      .login-shell {
        grid-template-columns: 1fr;
      }
      .brand-panel {
        min-height: 390px;
      }
      .form-panel {
        padding: 32px 22px;
      }
    }
  `]
})
export class LoginComponent implements AfterViewInit, OnDestroy {
  @ViewChild('googleButton', { static: true }) private readonly googleButton?: ElementRef<HTMLElement>;
  private readonly formBuilder = inject(FormBuilder);

  error = '';
  loading = false;
  googleNote = 'Preparando acceso con Google...';
  showGoogleFallback = true;

  form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly ngZone: NgZone
  ) {}

  ngAfterViewInit(): void {
    if (environment.googleClientId.startsWith('replace-with-')) {
      this.setState({
        error: 'Configura googleClientId en frontend/src/environments/environment.ts para activar Google.',
        googleNote: 'Usa tu cuenta institucional autorizada.',
        showGoogleFallback: true
      });
      return;
    }

    this.loadGoogleScript()
      .then(() => this.renderGoogleButton())
      .catch(() => {
        this.setState({
          error: 'No fue posible cargar Google Identity Services.',
          googleNote: 'Revisa conexion, bloqueadores o politicas del navegador.',
          showGoogleFallback: true
        });
      });
  }

  ngOnDestroy(): void {
    window.google?.accounts.id.cancel();
  }

  submitPasswordLogin(): void {
    if (this.form.invalid || this.loading) {
      return;
    }
    const { email, password } = this.form.getRawValue();
    this.setState({ error: '', loading: true });
    this.authService.login(email, password).subscribe({
      next: () => {
        this.setState({ loading: false });
        void this.router.navigateByUrl('/dashboard');
      },
      error: () => {
        this.setState({ error: 'Credenciales invalidas o usuario inactivo.', loading: false });
      }
    });
  }

  private renderGoogleButton(): void {
    const container = this.googleButton?.nativeElement;
    if (!container || !window.google) {
      this.setState({
        error: 'Google Identity Services no esta disponible.',
        googleNote: 'Usa el acceso con correo mientras se revisa la configuracion.',
        showGoogleFallback: true
      });
      return;
    }

    window.google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response) => this.handleGoogleCredential(response)
    });
    window.google.accounts.id.renderButton(container, {
      theme: 'outline',
      size: 'large',
      shape: 'rectangular',
      text: 'continue_with',
      width: 588,
      locale: 'es'
    });

    window.setTimeout(() => {
      const rendered = Boolean(container.querySelector('iframe, div[role="button"]'));
      this.setState({
        error: rendered ? '' : 'Google no renderizo el boton. Verifica que el OAuth Client ID permita el origen http://localhost:4200.',
        googleNote: 'Usa tu cuenta institucional autorizada.',
        showGoogleFallback: !rendered
      });
    }, 1200);
  }

  private handleGoogleCredential(response: GoogleCredentialResponse): void {
    if (!response.credential) {
      this.setState({ error: 'Google no retorno una credencial valida.', loading: false });
      return;
    }
    this.setState({ error: '', loading: true });
    this.authService.loginWithGoogle(response.credential).subscribe({
      next: () => {
        this.setState({ loading: false });
        void this.router.navigateByUrl('/dashboard');
      },
      error: () => {
        this.setState({
          error: 'No fue posible autenticar la cuenta de Google en MesoftX. Verifica que el correo exista como usuario activo.',
          loading: false
        });
      }
    });
  }

  private loadGoogleScript(): Promise<void> {
    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existingScript) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.id = GOOGLE_SCRIPT_ID;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.head.appendChild(script);
    });
  }

  private setState(state: Partial<Pick<LoginComponent, 'error' | 'loading' | 'googleNote' | 'showGoogleFallback'>>): void {
    this.ngZone.run(() => {
      Object.assign(this, state);
      this.changeDetectorRef.markForCheck();
    });
  }
}
