import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ExternalConnection } from '../../../domain/models/base-config.models';
import { BadgeComponent } from '../../../../../shared/ui/atoms/badge/badge.component';
import { ButtonComponent } from '../../../../../shared/ui/atoms/button/button.component';
import { CardComponent } from '../../../../../shared/ui/atoms/card/card.component';

const EMPTY_CONNECTION: ExternalConnection = {
  id: 0,
  name: '',
  type: 'API REST',
  endpoint: '',
  owner: '',
  status: 'inactivo'
};

@Component({
  selector: 'mx-external-connections',
  standalone: true,
  imports: [CommonModule, FormsModule, BadgeComponent, ButtonComponent, CardComponent],
  templateUrl: './external-connections.component.html',
  styleUrl: './external-connections.component.scss'
})
export class ExternalConnectionsComponent {
  readonly editingId = signal<number | null>(null);
  readonly connections = signal<ExternalConnection[]>([
    { id: 1, name: 'Google Workspace UNAB', type: 'OAuth', endpoint: 'https://accounts.google.com', owner: 'TI institucional', status: 'conectado' },
    { id: 2, name: 'Power BI', type: 'Analytics', endpoint: 'https://api.powerbi.com', owner: 'Acreditacion', status: 'conectado' },
    { id: 3, name: 'SIA - Sistema academico', type: 'API REST', endpoint: 'https://sia.unab.edu.co/api', owner: 'Registro academico', status: 'sincronizando' }
  ]);
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
      this.connections.update((items) => items.map((item) => item.id === editingId ? { ...this.draft, id: editingId } : item));
    } else {
      const nextId = Math.max(0, ...this.connections().map((item) => item.id)) + 1;
      this.connections.update((items) => [...items, { ...this.draft, id: nextId }]);
    }
    this.newConnection();
  }

  deleteConnection(id: number): void {
    this.connections.update((items) => items.filter((item) => item.id !== id));
  }

  toneFor(status: ExternalConnection['status']): 'success' | 'warning' | 'neutral' {
    return status === 'conectado' ? 'success' : status === 'sincronizando' ? 'warning' : 'neutral';
  }

  labelFor(status: ExternalConnection['status']): string {
    return status === 'conectado' ? 'Conectado' : status === 'sincronizando' ? 'Sincronizando' : 'Inactivo';
  }
}
