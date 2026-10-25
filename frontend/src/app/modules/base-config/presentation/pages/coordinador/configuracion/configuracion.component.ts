import { InputAtom } from '../../../../../../shared/ui/atoms/input/input.directive';
import { ButtonAtom } from '../../../../../../shared/ui/atoms/button/button.directive';
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { UserGateway as UserApiService } from '../../../../application/ports/user-api.service.port';
import { Period } from '../../../../domain/models/abet.models';

/**
 * Configuración general del coordinador. En el modelo v13 esta pantalla quedó
 * reducida: los periodos son el único parámetro que gestiona aquí (con su
 * pantalla dedicada en /coordinador/periodos), y las integraciones son
 * informativas. La gestión de usuarios y perfiles vive en el módulo /admin.
 */
@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [InputAtom, ButtonAtom, CommonModule, FormsModule],
  templateUrl: './configuracion.component.html',
  styleUrl: './configuracion.component.scss'
})
export class ConfiguracionComponent implements OnInit {
  loading = signal(true);
  error   = signal('');
  periods = signal<Period[]>([]);

  showPeriodForm = signal(false);
  newPeriodCode = '';

  constructor(private userApi: UserApiService) {}

  ngOnInit() {
    this.userApi.getPeriods().subscribe({
      next: (p) => { this.periods.set(p ?? []); this.loading.set(false); },
      error: (e: HttpErrorResponse) => {
        this.error.set(e.status === 401
          ? 'El catálogo de periodos requiere una sesión autenticada.'
          : (typeof e.error?.detail === 'string' ? e.error.detail : 'No se pudieron cargar los periodos.'));
        this.loading.set(false);
      },
    });
  }

  addPeriod() {
    const code = this.newPeriodCode.trim();
    if (!code) return;
    this.userApi.createPeriod({ code }).subscribe({
      next: (p) => { this.periods.set([...this.periods(), p]); this.cancelPeriod(); },
      error: (e: HttpErrorResponse) => this.error.set(
        typeof e.error?.detail === 'string' ? e.error.detail : 'No se pudo crear el período.'),
    });
  }
  cancelPeriod() { this.showPeriodForm.set(false); this.newPeriodCode = ''; }
}
