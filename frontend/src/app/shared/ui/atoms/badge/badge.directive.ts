import { Directive } from '@angular/core';

@Directive({ selector: '[mxBadge]', standalone: true, host: { class: 'mx-badge' } })
export class BadgeAtom {}
