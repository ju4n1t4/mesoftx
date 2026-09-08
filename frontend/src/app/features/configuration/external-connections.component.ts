import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { BadgeComponent } from '../../shared/atoms/badge/badge.component';
import { ButtonComponent } from '../../shared/atoms/button/button.component';
import { CardComponent } from '../../shared/atoms/card/card.component';

interface ExternalConnection {
  id: number;
  name: string;
  type: string;
  endpoint: string;
  owner: string;
  status: 'conectado' | 'sincronizando' | 'inactivo';
}

const EMPTY_CONNECTION: ExternalConnection = {
  id: 0,
  name: '',
  type: 'API REST',
  endpoint: '',
  owner: '',
  status: 'conectado'
};

@Component({
  selector: 'mx-external-connections',
  standalone: true,
  imports: [CommonModule, FormsModule, BadgeComponent, ButtonComponent, CardComponent],
  template: `
    <section class="page">
      <div class="heading">
        <div>
          <span>Configuracion / Conexiones Externas</span>
          <h1>Conexiones Externas</h1>
          <p>Administra integraciones y servicios conectados a MESOFTX.</p>
        </div>
        <mx-button icon="pi-plus" (clicked)="newConnection()">Nueva conexion</mx-button>
      </div>

      <section class="grid">
        <article *ngFor="let connection of connections()" class="connection-card">
          <div class="card-top">
            <i class="pi pi-link"></i>
            <mx-badge [tone]="toneFor(connection.status)">{{ connection.status }}</mx-badge>
          </div>
          <h2>{{ connection.name }}</h2>
          <p>{{ connection.type }}</p>
          <small>{{ connection.endpoint }}</small>
          <div class="card-actions">
            <button type="button" (click)="editConnection(connection)"><i class="pi pi-pencil"></i></button>
            <button type="button" (click)="toggleConnection(connection)"><i class="pi pi-power-off"></i></button>
            <button type="button" (click)="deleteConnection(connection.id)"><i class="pi pi-trash"></i></button>
          </div>
        </article>
      </section>

      <mx-card>
        <h2>{{ editingId() ? 'Editar conexion' : 'Registrar conexion' }}</h2>
        <form class="form" (ngSubmit)="saveConnection()">
          <label>Nombre<input name="name" [(ngModel)]="draft.name" required></label>
          <label>Tipo
            <select name="type" [(ngModel)]="draft.type">
              <option>API REST</option>
              <option>Google Workspace</option>
              <option>Power BI</option>
              <option>SIA Academico</option>
            </select>
          </label>
          <label>Endpoint<input name="endpoint" [(ngModel)]="draft.endpoint" required></label>
          <label>Responsable<input name="owner" [(ngModel)]="draft.owner" required></label>
          <label>Estado
            <select name="status" [(ngModel)]="draft.status">
              <option value="conectado">Conectado</option>
              <option value="sincronizando">Sincronizando</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </label>
          <div class="form-actions">
            <mx-button type="submit" icon="pi-save">Guardar</mx-button>
            <mx-button type="button" variant="ghost" (clicked)="newConnection()">Limpiar</mx-button>
          </div>
        </form>
      </mx-card>

      <p class="summary">{{ activeConnections() }} conexiones activas</p>
    </section>
  `,
  styles: [`
    .page { padding: 28px; }
    .heading { align-items: flex-start; display: flex; justify-content: space-between; margin-bottom: 22px; }
    .heading span { color: var(--mx-muted); font-size: 12px; font-weight: 800; }
    h1 { font-size: 26px; margin: 8px 0 7px; }
    p { color: var(--mx-muted); font-size: 13px; margin: 0; }
    .grid { display: grid; gap: 16px; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-bottom: 18px; }
    .connection-card { background: #fff; border: 1px solid var(--mx-border); border-radius: var(--mx-radius-card); box-shadow: var(--mx-shadow-soft); padding: 18px; }
    .card-top { align-items: center; display: flex; justify-content: space-between; }
    .card-top > i { align-items: center; background: #f3e8ff; border-radius: 8px; color: var(--mx-secondary); display: inline-flex; height: 34px; justify-content: center; width: 34px; }
    .connection-card h2 { font-size: 16px; margin: 16px 0 6px; }
    .connection-card small { color: #8a8791; display: block; font-size: 12px; margin-top: 12px; overflow-wrap: anywhere; }
    .card-actions { display: flex; gap: 8px; margin-top: 16px; }
    .card-actions button { background: #f7f7f9; border: 1px solid var(--mx-border); border-radius: 8px; cursor: pointer; height: 34px; width: 34px; }
    .form { display: grid; gap: 14px; grid-template-columns: repeat(5, minmax(0, 1fr)); margin-top: 16px; }
    label { color: #55515e; display: grid; font-size: 12px; font-weight: 800; gap: 7px; }
    input, select { border: 1px solid var(--mx-border); border-radius: 8px; min-height: 40px; padding: 0 11px; }
    .form-actions { align-items: end; display: flex; gap: 10px; }
    .summary { font-weight: 800; margin-top: 14px; }
    @media (max-width: 1100px) { .grid, .form { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 700px) { .heading { display: grid; gap: 14px; } .grid, .form { grid-template-columns: 1fr; } }
  `]
})
export class ExternalConnectionsComponent {
  readonly connections = signal<ExternalConnection[]>([
    { id: 1, name: 'Google Workspace UNAB', type: 'Google Workspace', endpoint: 'https://workspace.google.com', owner: 'TI Institucional', status: 'conectado' },
    { id: 2, name: 'Power BI', type: 'Power BI', endpoint: 'https://app.powerbi.com', owner: 'Planeacion', status: 'conectado' },
    { id: 3, name: 'SIA Academico', type: 'SIA Academico', endpoint: 'https://sia.unab.edu.co', owner: 'Registro Academico', status: 'sincronizando' }
  ]);
  readonly editingId = signal<number | null>(null);
  readonly activeConnections = computed(() => this.connections().filter((item) => item.status !== 'inactivo').length);
  draft: ExternalConnection = { ...EMPTY_CONNECTION };

  newConnection(): void {
    this.editingId.set(null);
    this.draft = { ...EMPTY_CONNECTION };
  }

  editConnection(connection: ExternalConnection): void {
    this.editingId.set(connection.id);
    this.draft = { ...connection };
  }

  saveConnection(): void {
    const editingId = this.editingId();
    if (editingId) {
      this.connections.update((items) => items.map((item) => (item.id === editingId ? { ...this.draft, id: editingId } : item)));
    } else {
      const nextId = Math.max(0, ...this.connections().map((item) => item.id)) + 1;
      this.connections.update((items) => [...items, { ...this.draft, id: nextId }]);
    }
    this.newConnection();
  }

  toggleConnection(connection: ExternalConnection): void {
    this.connections.update((items) => items.map((item) => item.id === connection.id ? { ...item, status: item.status === 'inactivo' ? 'conectado' : 'inactivo' } : item));
  }

  deleteConnection(id: number): void {
    this.connections.update((items) => items.filter((item) => item.id !== id));
    if (this.editingId() === id) {
      this.newConnection();
    }
  }

  toneFor(status: ExternalConnection['status']): 'success' | 'warning' | 'danger' {
    return status === 'conectado' ? 'success' : status === 'sincronizando' ? 'warning' : 'danger';
  }
}
