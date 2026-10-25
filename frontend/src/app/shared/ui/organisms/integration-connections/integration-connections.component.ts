import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonAtom } from '../../atoms/button/button.directive';
import { BadgeAtom } from '../../atoms/badge/badge.directive';

export interface ConnectionItem { id: number; name: string; enabled: boolean; credential_configured: boolean; }
@Component({ selector: 'mx-integration-connections', standalone: true, imports: [CommonModule, ButtonAtom, BadgeAtom],
  templateUrl: './integration-connections.component.html', styleUrl: './integration-connections.component.scss' })
export class IntegrationConnectionsComponent {
  @Input() items: readonly ConnectionItem[] = [];
  @Input() busy = false;
  @Output() selected = new EventEmitter<number>();
}
