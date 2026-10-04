import { Component } from '@angular/core';

@Component({
  selector: 'app-spinner',
  styleUrl: './spinner.component.css',
  template: '<span role="status" aria-label="Loading"></span>',
})
export class SpinnerComponent {}
