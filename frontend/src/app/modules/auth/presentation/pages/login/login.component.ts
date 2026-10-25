import { InputAtom } from '../../../../../shared/ui/atoms/input/input.directive';
import { ButtonAtom } from '../../../../../shared/ui/atoms/button/button.directive';
import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../application/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [InputAtom, ButtonAtom, CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  form: FormGroup;
  loading  = signal(false);
  errorMsg = signal('');
  showPass = signal(false);
  /** Perfiles de demostración que ofrece el servidor (vacío = modo exposición apagado). */
  demoRoles = signal<string[]>([]);
  demoLoading = signal(false);

  constructor(private fb: FormBuilder, private auth: AuthService) {
    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.auth.getAuthMode().subscribe(m => this.demoRoles.set(m.demo_enabled ? m.demo_roles : []));
  }

  roleLabel(key: string): string {
    return ({ administrativo: 'Administrador', coordinador: 'Coordinador', profesor: 'Profesor', auditor: 'Auditor' } as Record<string, string>)[key] ?? key;
  }

  enterDemo(role: string) {
    this.demoLoading.set(true);
    this.errorMsg.set('');
    this.auth.demoLogin(role).subscribe({
      error: () => {
        this.demoLoading.set(false);
        this.errorMsg.set('El modo exposición no está disponible en este momento.');
      },
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
