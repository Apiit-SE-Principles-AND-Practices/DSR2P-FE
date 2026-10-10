import { Component, computed, input } from '@angular/core';
import { SkeletonComponent } from './skeleton.component';

/** A column of `rows` placeholder blocks, for content that is a list while it loads. */
@Component({
  selector: 'app-skeleton-stack',
  imports: [SkeletonComponent],
  styles: `
    :host {
      display: grid;
      gap: var(--space-3);
    }
  `,
  host: { role: 'status', 'aria-label': 'Loading' },
  template: `
    @for (row of items(); track row) {
      <app-skeleton [height]="height()" />
    }
  `,
})
export class SkeletonStackComponent {
  readonly rows = input(3);
  readonly height = input('var(--space-8)');
  protected readonly items = computed(() => Array.from({ length: this.rows() }, (_, i) => i));
}
