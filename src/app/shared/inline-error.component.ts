import { Component, input, output } from '@angular/core';

/** Inline error banner with a Retry action: never a blank page, never a silent failure. */
@Component({
  selector: 'app-inline-error',
  styleUrl: './inline-error.component.css',
  template: `
    <div role="alert">
      <p>{{ message() }}</p>
      <button type="button" class="btn" (click)="retry.emit()">Retry</button>
    </div>
  `,
})
export class InlineErrorComponent {
  readonly message = input.required<string>();
  readonly retry = output();
}
