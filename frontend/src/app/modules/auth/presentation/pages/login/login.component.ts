import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { environment } from '../../../../../../environment/environment';
import { ButtonComponent } from '../../../../../shared/ui/atoms/button/button.component';
import { InputComponent } from '../../../../../shared/ui/atoms/input/input.component';
import { FormFieldComponent } from '../../../../../shared/ui/molecules/form-field/form-field.component';
import { AuthSessionService } from '../../../application/services/auth-session.service';

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
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements AfterViewInit, OnDestroy {
  @ViewChild('googleButton') googleButton?: ElementRef<HTMLElement>;

  private readonly authSession = inject(AuthSessionService);
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
    this.authSession.login(this.form.getRawValue()).subscribe({
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
      callback: (response) => this.handleGoogleCredential(response.credential)
    });
    window.google.accounts.id.renderButton(target, { theme: 'outline', size: 'large', width: 380, text: 'continue_with' });
  }

  private handleGoogleCredential(credential?: string): void {
    if (!credential) {
      return;
    }
    this.loading.set(true);
    this.authSession.loginWithGoogle(credential).subscribe({
      next: () => void this.router.navigateByUrl('/dashboard'),
      error: () => {
        this.loading.set(false);
        this.message.set('La cuenta Google no esta autorizada en MesoftX.');
      }
    });
  }

  private renderGooglePlaceholder(): void {
    const target = this.googleButton?.nativeElement;
    if (target) {
      target.textContent = 'Configura Google Client ID para habilitar este acceso';
    }
  }
}
