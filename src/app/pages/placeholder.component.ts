import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/** Stand-in for screens that arrive in later tickets, so guarded routes exist from DSR2P-7 on. */
@Component({
  selector: 'app-placeholder',
  template: `
    <h1>{{ title }}</h1>
    <p>Coming soon.</p>
  `,
})
export class PlaceholderComponent {
  protected readonly title = inject(ActivatedRoute).snapshot.data['title'] as string;
}
