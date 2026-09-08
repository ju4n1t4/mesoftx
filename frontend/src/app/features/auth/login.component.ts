import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { ButtonComponent } from '../../shared/atoms/button/button.component';
import { InputComponent } from '../../shared/atoms/input/input.component';
import { FormFieldComponent } from '../../shared/molecules/form-field/form-field.component';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: { client_id: string; callback: (response: { credential?: string }) => void }) => void;
          renderButton: (element: HTMLElement, options: Record<string, string | number | boolean>) => void;
        };
      };
    };
  }
}

@Component({
  selector: 'mx-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, InputComponent, FormFieldComponent],
  template: `
    <main class="login-page">
      <section class="login-card">
        <aside class="brand-panel">
          <div class="brand">
            <span>M</span>
            <strong>MESOFTX</strong>
          </div>
          <div class="brand-copy">
            <h1>Valoracion de Resultados de Aprendizaje ABET</h1>
            <p>Plataforma institucional de la Facultad de Ingenieria · UNAB.</p>
            <ul>
              <li>Acceso con cuenta institucional UNAB</li>
              <li>Redireccion automatica segun tu rol</li>
              <li>Dashboards de indicadores en tiempo real</li>
            </ul>
          </div>
        </aside>

        <section class="form-panel">
          <span class="eyebrow">Acceso · cuenta institucional</span>
          <h2>Bienvenido</h2>
          <p>Ingresa con tu cuenta institucional UNAB para continuar.</p>

          <div #googleButton class="google-button"></div>
          <div class="divider"><span>o continua con correo</span></div>

          <form [formGroup]="form" (ngSubmit)="submit()">
            <mx-form-field label="Correo institucional">
              <mx-input formControlName="email" type="email" icon="pi-envelope" autocomplete="email" placeholder="profesor@unab.edu.co" />
            </mx-form-field>
            <mx-form-field label="Contrasena">
              <mx-input formControlName="password" type="password" icon="pi-lock" autocomplete="current-password" placeholder="••••••••" />
            </mx-form-field>
            <p *ngIf="message()" class="message">{{ message() }}</p>
            <mx-button type="submit" [disabled]="form.invalid || loading()" icon="pi-sign-in">
              {{ loading() ? 'Validando...' : 'Iniciar sesion' }}
            </mx-button>
          </form>
        </section>
      </section>
    </main>
  `,
  styles: [`
    .login-page {
      align-items: center;
      background: #eeece7;
      display: flex;
      min-height: 100vh;
      padding: 42px;
    }
    .login-card {
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 24px 70px rgba(15, 23, 42, .12);
      display: grid;
      grid-template-columns: minmax(280px, 420px) minmax(320px, 590px);
      margin: 0 auto;
      max-width: 1010px;
      min-height: 560px;
      overflow: hidden;
      width: 100%;
    }
    .brand-panel {
      background: linear-gradient(145deg, #ffb21d 0%, #ff930f 58%, #f47a1e 100%);
      color: #fff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      padding: 40px;
      position: relative;
    }
    .brand-panel::after {
      background: rgba(255, 255, 255, .15);
      border-radius: 999px;
      content: "";
      height: 220px;
      position: absolute;
      right: -64px;
      top: -30px;
      width: 220px;
    }
    .brand,
    .brand-copy {
      position: relative;
      z-index: 1;
    }
    .brand {
      align-items: center;
      display: flex;
      gap: 12px;
      font-size: 14px;
      font-weight: 800;
    }
    .brand span {
      align-items: center;
      background: #fff;
      border-radius: 8px;
      color: var(--mx-primary);
      display: inline-flex;
      height: 38px;
      justify-content: center;
      width: 38px;
    }
    h1 {
      font-size: 32px;
      line-height: 1.02;
      margin: 0 0 18px;
      max-width: 330px;
    }
    .brand-copy p {
      font-size: 14px;
      font-weight: 600;
      line-height: 1.45;
      max-width: 340px;
    }
    ul {
      display: grid;
      font-size: 12px;
      font-weight: 700;
      gap: 10px;
      list-style: none;
      margin: 26px 0 0;
      padding: 0;
    }
    li::before {
      content: "✓";
      margin-right: 10px;
    }
    .form-panel {
      align-self: center;
      margin: 0 auto;
      max-width: 460px;
      padding: 44px;
      width: 100%;
    }
    .eyebrow {
      color: #a4a0aa;
      display: block;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: .12em;
      margin-bottom: 32px;
      text-transform: uppercase;
    }
    h2 {
      font-size: 26px;
      line-height: 1;
      margin: 0 0 8px;
    }
    .form-panel p {
      color: var(--mx-muted);
      font-size: 13px;
      margin: 0 0 24px;
    }
    .google-button {
      align-items: center;
      border: 1px solid var(--mx-border);
      border-radius: 8px;
      display: flex;
      justify-content: center;
      min-height: 42px;
      overflow: hidden;
    }
    .divider {
      align-items: center;
      color: #b0abb5;
      display: flex;
      font-size: 11px;
      font-weight: 700;
      gap: 14px;
      margin: 20px 0;
    }
    .divider::before,
    .divider::after {
      background: var(--mx-border);
      content: "";
      flex: 1;
      height: 1px;
    }
    form {
      display: grid;
      gap: 14px;
    }
    .message {
      background: #fff1f2;
      border: 1px solid #fecdd3;
      border-radius: 8px;
      color: var(--mx-danger);
      font-size: 12px;
      font-weight: 800;
      padding: 10px 12px;
    }
    mx-button {
      display: block;
      margin-top: 4px;
    }
    mx-button ::ng-deep .mx-button {
      width: 100%;
    }
    @media (max-width: 820px) {
      .login-page {
        padding: 18px;
      }
      .login-card {
        grid-template-columns: 1fr;
      }
      .brand-panel {
        min-height: 320px;
      }
      .form-panel {
        padding: 30px 22px;
      }
    }
  `]
})
export class LoginComponent implements AfterViewInit, OnDestroy {
  @ViewChild('googleButton') googleButton?: ElementRef<HTMLElement>;

  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private script?: HTMLScriptElement;

  readonly loading = signal(false);
  readonly message = signal('');
  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  ngAfterViewInit(): void {
    this.loadGoogleButton();
  }

  ngOnDestroy(): void {
    this.script?.remove();
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    this.loading.set(true);
    this.message.set('');
    const { email, password } = this.form.getRawValue();

    this.authService.login(email, password).subscribe({
      next: () => void this.router.navigateByUrl('/dashboard'),
      error: () => {
        this.loading.set(false);
        this.message.set('No fue posible iniciar sesion. Revisa tus credenciales.');
      }
    });
  }

  private loadGoogleButton(): void {
    if (environment.googleClientId.startsWith('replace-with-')) {
      this.renderGooglePlaceholder();
      return;
    }

    this.script = document.createElement('script');
    this.script.src = 'https://accounts.google.com/gsi/client';
    this.script.async = true;
    this.script.defer = true;
    this.script.onload = () => this.renderGoogleButton();
    document.head.appendChild(this.script);
  }

  private renderGoogleButton(): void {
    const target = this.googleButton?.nativeElement;
    if (!target || !window.google) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response) => {
        if (!response.credential) {
          return;
        }
        this.loading.set(true);
        this.authService.loginWithGoogle(response.credential).subscribe({
          next: () => void this.router.navigateByUrl('/dashboard'),
          error: () => {
            this.loading.set(false);
            this.message.set('La cuenta Google no esta autorizada en MesoftX.');
          }
        });
      }
    });
    window.google.accounts.id.renderButton(target, { theme: 'outline', size: 'large', width: 380, text: 'continue_with' });
  }

  private renderGooglePlaceholder(): void {
    const target = this.googleButton?.nativeElement;
    if (target) {
      target.textContent = 'Configura Google Client ID para habilitar este acceso';
    }
  }
}
