import { Component } from '@angular/core';

@Component({
  selector: 'app-error-fallback',
  template: `
    <div role="alert">
      <h1>Something went wrong</h1>
      <p>An unexpected error occurred. Reloading the page usually fixes it.</p>
      <button type="button" class="btn" (click)="reload()">Reload</button>
    </div>
  `,
})
export class ErrorFallbackComponent {
  protected reload(): void {
    location.reload();
  }
}
