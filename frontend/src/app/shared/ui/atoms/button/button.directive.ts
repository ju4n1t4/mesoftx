import { Directive } from '@angular/core';

@Directive({ selector: 'button[mxButton],a[mxButton]', standalone: true, host: { class: 'mx-button' } })
export class ButtonAtom {}
