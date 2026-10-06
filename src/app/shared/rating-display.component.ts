import { Component, input } from '@angular/core';

/** Stars plus the numeral (never stars alone), or "No ratings yet". `count` is the number of reviews, when known. */
@Component({
  selector: 'app-rating-display',
  styles: `
    .stars {
      color: var(--ds-rating);
      letter-spacing: 1px;
    }
    .rating-num {
      color: var(--ds-ink);
      font-weight: var(--font-weight-medium);
      margin-left: var(--space-1);
    }
    .rating-count {
      color: var(--ds-ink-muted);
      font-size: var(--font-size-caption);
      margin-left: 2px;
    }
  `,
  template: `
    @let value = rating();
    @if (value === null) {
      <span class="ds-caption">No ratings yet</span>
    } @else {
      <span aria-hidden="true">
        <span class="stars">{{ stars(value) }}</span>
        <strong class="rating-num">{{ value.toFixed(1) }}</strong>
        @if (count() !== undefined) {
          <span class="rating-count"> ({{ count() }})</span>
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
})
export class RatingDisplayComponent {
  readonly rating = input.required<number | null>();
  readonly count = input<number>();

  protected stars(value: number): string {
    const filled = Math.round(value);
    return '★'.repeat(filled) + '☆'.repeat(5 - filled);
  }
}
