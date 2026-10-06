import { Component, input } from '@angular/core';

/** Stars plus the numeral (never stars alone), or "No ratings yet". `count` is the number of reviews, when known. */
@Component({
  selector: 'app-rating-display',
  template: `
    @let value = rating();
    @if (value === null) {
      <span>No ratings yet</span>
    } @else {
      <span aria-hidden="true">
        <span class="stars">{{ stars(value) }}</span> <strong>{{ value.toFixed(1) }}</strong>
        @if (count() !== undefined) {
          ({{ count() }})
        }
      </span>
      <span class="sr-only">
        Rated {{ value.toFixed(1) }} out of 5
        @if (count() !== undefined) {
          from {{ count() }} reviews
        }
      </span>
    }
  `,
  styles: '.stars { color: var(--color-warning-text); }',
})
export class RatingDisplayComponent {
  readonly rating = input.required<number | null>();
  readonly count = input<number>();

  protected stars(value: number): string {
    const filled = Math.round(value);
    return '★'.repeat(filled) + '☆'.repeat(5 - filled);
  }
}
