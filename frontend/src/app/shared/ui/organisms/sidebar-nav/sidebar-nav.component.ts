import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ButtonAtom } from '../../atoms/button/button.directive';
export interface NavItem { label: string; icon: string; route: string; exact?: boolean; }
@Component({ selector: 'mx-sidebar-nav', standalone: true, imports: [CommonModule, RouterLink, RouterLinkActive, ButtonAtom],
  templateUrl: './sidebar-nav.component.html', styleUrl: './sidebar-nav.component.scss' })
export class SidebarNavComponent {
  @Input() items: readonly NavItem[] = [];
  @Input() helpRoute = '';
  @Output() logoutRequested = new EventEmitter<void>();
}
