import { Component, computed, input, type ResourceRef } from '@angular/core';
import { ratingBreakdown } from '../../core/rating-breakdown';
import type { Review } from '../../core/restaurant.service';
import { InlineErrorComponent } from '../../shared/inline-error.component';
import { RatingBarComponent } from '../../shared/rating-bar.component';
import { SkeletonStackComponent } from '../../shared/skeleton-stack.component';

/** Food, service and other ratings from the approved reviews (shared with the reviews list, so one request). */
@Component({
  selector: 'app-rating-breakdown',
  imports: [InlineErrorComponent, RatingBarComponent, SkeletonStackComponent],
  styles: `
    :host {
      display: block;
      margin-bottom: var(--space-4);
    }
    .ratings-card {
      background: var(--ds-surface-raised);
      border: 1px solid var(--ds-border);
      border-radius: var(--radius-md);
      padding: var(--space-4);
      box-shadow: var(--ds-shadow-sm);
    }
    h2 {
      font-size: var(--font-size-h2);
      font-weight: var(--font-weight-medium);
      color: var(--ds-ink);
      margin: 0 0 var(--space-2);
    }
    .summary-caption {
      color: var(--ds-ink-muted);
      font-size: var(--font-size-caption);
      margin: 0 0 var(--space-3);
    }
  `,
  template: `
    <section
      class="ratings-card"
      aria-labelledby="breakdown-title"
      role="group"
      aria-label="Ratings breakdown"
    >
      <h2 id="breakdown-title">Ratings</h2>
      @let b = breakdown();
      @if (reviews().error()) {
        <app-inline-error message="Could not load ratings." (retry)="reviews().reload()" />
      } @else if (b) {
        @if (b.count === 0) {
          <p class="summary-caption">No approved reviews yet — be the first to write one.</p>
        } @else {
          <p class="summary-caption">
            Based on {{ b.count }} approved {{ b.count === 1 ? 'review' : 'reviews' }}.
          </p>
          <app-rating-bar label="Food quality" [value]="b.food" />
          <app-rating-bar label="Service" [value]="b.service" />
          <app-rating-bar label="Other" [value]="b.misc" />
        }
      } @else {
        <app-skeleton-stack [rows]="4" height="var(--space-4)" />
      }
    </section>
  `,
})
export class RatingBreakdownComponent {
  readonly reviews = input.required<ResourceRef<Review[] | undefined>>();
  protected readonly breakdown = computed(() => {
    const list = this.reviews().value();
    return list && ratingBreakdown(list);
  });
}
