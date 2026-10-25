import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UserGateway as UserApiService } from '../../../../application/ports/user-api.service.port';
import { AssesmentGateway as AssesmentApiService } from '../../../../application/ports/assesment-api.service.port';
import { Program } from '../../../../domain/models/abet.models';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-coord-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './coord-dashboard.component.html',
  styleUrl: './coord-dashboard.component.scss'
})
export class CoordDashboardComponent implements OnInit {
  loading = signal(true);
  error   = signal('');

  careers      = signal<Program[]>([]);
  careersCount  = signal(0);
  teachersCount = signal(0);
  sosCount      = signal(0);
  resultsCount  = signal(0);

  constructor(private userApi: UserApiService, private assesment: AssesmentApiService) {}

  ngOnInit() {
    forkJoin({
      careers: this.userApi.getPrograms(),
      users:   this.userApi.getUsers(),
      roles:   this.userApi.getRoles(),
      sos:     this.assesment.getStudentOutcomes(),
      results: this.assesment.getRubrics(),
    }).subscribe({
      next: (r) => {
        this.careers.set(r.careers);
        this.careersCount.set(r.careers.length);
        const profesorRole = r.roles.find(x => x.name?.toLowerCase() === 'profesor');
        this.teachersCount.set(profesorRole ? r.users.filter(u => u.role_id === profesorRole.id).length : 0);
        this.sosCount.set(r.sos.length);
        this.resultsCount.set(r.results.length);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo conectar con el servicio. Verifica que los microservicios estén activos.');
        this.loading.set(false);
      },
    });
  }
}
