import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { CardComponent } from '../../shared/atoms/card/card.component';

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
  imports: [CommonModule, CardComponent],
  template: `
    <main class="login">
      <section class="hero">
        <div class="mark">M</div>
        <h1>MESOFTX</h1>
        <p>Gestion de valoracion ABET para programas de ingenieria UNAB.</p>
      </section>
      <mx-card>
        <section class="login-card">
          <span class="eyebrow">Acceso institucional</span>
          <h2>Iniciar sesion</h2>
          <p>Usa tu cuenta institucional de Google para acceder a MesoftX.</p>
          <div #googleButton class="google-button"></div>
          <p class="error" *ngIf="error">{{ error }}</p>
          <small>El acceso se valida con Google y luego User_MS emite el JWT interno.</small>
        </section>
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
    .login-card { display: grid; gap: 16px; }
    .eyebrow { color: var(--mx-primary); font: 800 12px Inter, system-ui, sans-serif; text-transform: uppercase; }
    h2 { color: var(--mx-ink); font: 800 28px Inter, system-ui, sans-serif; margin: 0; }
    .login-card p { color: var(--mx-muted); font: 500 14px/1.5 Inter, system-ui, sans-serif; margin: 0; }
    .google-button { min-height: 44px; }
    .error { background: #fee2e2; border-radius: 8px; color: var(--mx-danger); font: 700 12px Inter, system-ui, sans-serif; padding: 10px 12px; }
    small { color: var(--mx-muted); font: 500 11px/1.5 Inter, system-ui, sans-serif; }
    @media (max-width: 840px) {
      .login { grid-template-columns: 1fr; padding: 24px; }
    }
  `]
})
export class LoginComponent implements AfterViewInit, OnDestroy {
  @ViewChild('googleButton', { static: true }) private readonly googleButton?: ElementRef<HTMLElement>;
  error = '';

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  ngAfterViewInit(): void {
    if (environment.googleClientId.startsWith('replace-with-')) {
      this.error = 'Configura GOOGLE_CLIENT_ID para habilitar el login con Google.';
      return;
    }
    this.loadGoogleScript()
      .then(() => this.renderGoogleButton())
      .catch(() => {
        this.error = 'No fue posible cargar Google Identity Services.';
      });
  }

  ngOnDestroy(): void {
    window.google?.accounts.id.cancel();
  }

  private renderGoogleButton(): void {
    const container = this.googleButton?.nativeElement;
    if (!container || !window.google) {
      this.error = 'Google Identity Services no esta disponible.';
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
      text: 'signin_with',
      width: 320,
      locale: 'es'
    });
  }

  private handleGoogleCredential(response: GoogleCredentialResponse): void {
    if (!response.credential) {
      this.error = 'Google no retorno una credencial valida.';
      return;
    }
    this.error = '';
    this.authService.loginWithGoogle(response.credential).subscribe({
      next: () => void this.router.navigateByUrl('/dashboard'),
      error: () => {
        this.error = 'No fue posible autenticar la cuenta de Google en MesoftX.';
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
}
