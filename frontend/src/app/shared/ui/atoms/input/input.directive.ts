import { Directive } from '@angular/core';

@Directive({ selector: 'input[mxInput],select[mxInput],textarea[mxInput]', standalone: true, host: { class: 'mx-input' } })
export class InputAtom {}
