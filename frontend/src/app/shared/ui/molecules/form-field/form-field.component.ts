import { Component, Input } from '@angular/core';

@Component({
  selector: 'mx-form-field',
  standalone: true,
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.scss'
})
export class FormFieldComponent {
  @Input({ required: true }) label = '';
}
