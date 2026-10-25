import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent {
  items = [
    { title: 'Perfiles y permisos', description: 'Administra roles y permisos agrupados por módulo.', icon: 'pi-shield', route: '/admin/perfiles' },
    { title: 'Usuarios', description: 'Crea, edita y activa usuarios del sistema.', icon: 'pi-users', route: '/admin/usuarios' },
    { title: 'Periodos', description: 'Define el periodo académico activo y su histórico.', icon: 'pi-calendar', route: '/admin/periodos' },
    { title: 'Facultades', description: 'Gestiona las facultades disponibles para los procesos ABET.', icon: 'pi-building', route: '/admin/facultades' },
  ];
}
