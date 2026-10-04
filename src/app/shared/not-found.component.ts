import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <h1>Page not found</h1>
    <p>We could not find the page you were looking for.</p>
    <a class="btn" routerLink="/">Back to home</a>
  `,
})
export class NotFoundComponent {}
