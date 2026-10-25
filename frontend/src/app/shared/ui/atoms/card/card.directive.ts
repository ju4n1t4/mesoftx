import { Directive } from '@angular/core';

@Directive({ selector: '[mxCard]', standalone: true, host: { class: 'mx-card' } })
export class CardAtom {}
