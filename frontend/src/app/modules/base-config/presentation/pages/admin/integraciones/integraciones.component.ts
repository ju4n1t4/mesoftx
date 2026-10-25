import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { IntegrationsGateway } from '../../../../application/ports/integrations.gateway';
import { IntegrationConnection, IntegrationDraft, IntegrationRun, IntegrationRecord } from '../../../../domain/models/integrations.models';
import { IntegrationConnectionsComponent } from '../../../../../../shared/ui/organisms/integration-connections/integration-connections.component';
import { FormFieldComponent } from '../../../../../../shared/ui/molecules/form-field/form-field.component';
import { ButtonAtom } from '../../../../../../shared/ui/atoms/button/button.directive';
import { InputAtom } from '../../../../../../shared/ui/atoms/input/input.directive';
import { CardAtom } from '../../../../../../shared/ui/atoms/card/card.directive';

@Component({ selector: 'app-integraciones', standalone: true,
  imports: [CommonModule, FormsModule, IntegrationConnectionsComponent, FormFieldComponent, ButtonAtom, InputAtom, CardAtom],
  templateUrl: './integraciones.component.html', styleUrl: './integraciones.component.scss' })
export class IntegracionesComponent implements OnInit {
  connections = signal<IntegrationConnection[]>([]);
  runs = signal<IntegrationRun[]>([]);
  records = signal<IntegrationRecord[]>([]);
  selectedId = signal<number|null>(null);
  busy = signal(false);
  message = signal('');
  draft: IntegrationDraft = this.emptyDraft();
  constructor(private gateway: IntegrationsGateway) {}
  ngOnInit() { this.reload(); }
  reload() { this.gateway.list().subscribe({ next: list => this.connections.set(list), error: () => this.message.set('No se pudieron cargar las conexiones.') }); }
  emptyDraft(): IntegrationDraft { return { name: '', base_url: '', resource_path: '/', records_path: '', external_id_field: 'id', auth_type: 'none', enabled: false, secret: '' }; }
  newConnection() { this.selectedId.set(null); this.draft = this.emptyDraft(); this.message.set(''); this.runs.set([]); this.records.set([]); }
  select(id: number) {
    const connection = this.connections().find(item => item.id === id);
    if (!connection) return;
    this.selectedId.set(id);
    this.draft = { name: connection.name, base_url: connection.base_url, resource_path: connection.resource_path, records_path: connection.records_path,
      external_id_field: connection.external_id_field, auth_type: connection.auth_type, enabled: connection.enabled, secret: '' };
    this.loadHistory(id);
  }
  save() {
    if (this.busy()) return;
    if (!this.draft.name.trim() || !this.draft.base_url.trim()) { this.message.set('Indique un nombre y una URL de origen HTTPS.'); return; }
    const draft = { ...this.draft };
    if (!draft.secret) delete draft.secret;
    const id = this.selectedId();
    this.busy.set(true);
    (id === null ? this.gateway.create(draft) : this.gateway.update(id, draft)).subscribe({
      next: connection => { this.busy.set(false); this.draft.secret = ''; this.selectedId.set(connection.id); this.message.set('Conexión guardada.'); this.reload(); },
      error: () => { this.busy.set(false); this.message.set('No se pudo guardar. Revise la configuración permitida por el servidor.'); },
    });
  }
  probe() {
    const id = this.selectedId(); if (id === null || this.busy()) return;
    this.busy.set(true);
    this.gateway.probe(id).subscribe({ next: () => { this.busy.set(false); this.message.set('La conexión responde correctamente.'); },
      error: () => { this.busy.set(false); this.message.set('La conexión no respondió. Revise la configuración y la credencial.'); } });
  }
  sync() {
    const id = this.selectedId(); if (id === null || this.busy()) return;
    this.busy.set(true);
    this.gateway.sync(id, crypto.randomUUID()).subscribe({ next: run => { this.busy.set(false); this.message.set(`Sincronización ${run.status}: ${run.records_count} registros.`); this.loadHistory(id); },
      error: () => { this.busy.set(false); this.message.set('No se pudo sincronizar. Consulte el historial.'); this.loadHistory(id); } });
  }
  private loadHistory(id: number) {
    forkJoin({ runs: this.gateway.runs(id), records: this.gateway.records(id) }).subscribe({
      next: data => { if (this.selectedId() === id) { this.runs.set(data.runs); this.records.set(data.records); } },
      error: () => this.message.set('No se pudo cargar el historial de sincronización.'),
    });
  }
}
