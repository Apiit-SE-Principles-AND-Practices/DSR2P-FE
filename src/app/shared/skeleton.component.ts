import { Component, input } from '@angular/core';

/** Grey placeholder block shown while content loads. Size it with `height` (any CSS length). */
@Component({
  selector: 'app-skeleton',
  styleUrl: './skeleton.component.css',
  host: { 'aria-hidden': 'true', '[style.height]': 'height()' },
  template: '',
})
export class SkeletonComponent {
  readonly height = input('var(--space-4)');
}
