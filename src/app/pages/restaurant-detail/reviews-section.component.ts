import { Component, computed, inject, input, signal, type ResourceRef } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import type { Review } from '../../core/restaurant.service';
import { REVIEW_SORTS, sortReviews, type ReviewSort } from '../../core/reviews';
import { InlineErrorComponent } from '../../shared/inline-error.component';
import { SkeletonComponent } from '../../shared/skeleton.component';
import { ReviewCardComponent } from './review-card.component';
import { WriteReviewButtonComponent } from './write-review-button.component';

const PAGE_SIZE = 10;
const LABELS: Record<ReviewSort, string> = {
  newest: 'Most recent',
  oldest: 'Oldest first',
  highest: 'Highest rated',
  lowest: 'Lowest rated',
};

/** Approved reviews with sorting (kept in the URL as `?reviewSort=`) and a "Load more" button. */
@Component({
  selector: 'app-reviews-section',
  imports: [
    InlineErrorComponent,
    ReviewCardComponent,
    SkeletonComponent,
    WriteReviewButtonComponent,
  ],
  template: `
    <section aria-labelledby="reviews-title">
      <h2 id="reviews-title">
        Reviews
        @if (list(); as all) {
          ({{ all.length }})
        }
      </h2>
      @let all = list();
      @if (reviews().error()) {
        <app-inline-error message="Could not load reviews." (retry)="reviews().reload()" />
      } @else if (all) {
        @if (all.length === 0) {
          <p>No approved reviews yet.</p>
          <app-write-review-button [restaurantId]="restaurantId()" />
        } @else {
          <div class="field">
            <label for="review-sort">Sort reviews</label>
            <select id="review-sort" class="select" #sortBox (change)="pick(sortBox.value)">
              @for (option of sorts; track option) {
                <option [value]="option" [selected]="option === sort()">
                  {{ labels[option] }}
                </option>
              }
            </select>
          </div>
          @for (review of shown(); track review.id) {
            <app-review-card
              [review]="review"
              [replying]="replying() === review.id"
              (replyOpen)="replying.set(review.id)"
              (replyClose)="replying.set(null)"
              (refresh)="reviews().reload()"
            />
          }
          @if (shown().length < sorted().length) {
            <button type="button" class="btn secondary" (click)="visible.set(visible() + pageSize)">
              Load more
            </button>
          }
        }
      } @else {
        <app-skeleton height="var(--space-12)" />
      }
    </section>
  `,
})
export class ReviewsSectionComponent {
  readonly reviews = input.required<ResourceRef<Review[] | undefined>>();
  readonly restaurantId = input.required<string>();

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly query = toSignal(this.route.queryParamMap, { requireSync: true });

  protected readonly sorts = REVIEW_SORTS;
  protected readonly labels = LABELS;
  protected readonly pageSize = PAGE_SIZE;
  protected readonly visible = signal(PAGE_SIZE);
  /** The review whose reply box is open: opening another closes this one. */
  protected readonly replying = signal<number | null>(null);

  protected readonly sort = computed(
    () => REVIEW_SORTS.find((s) => s === this.query().get('reviewSort')) ?? 'newest',
  );
  protected readonly list = computed(() => this.reviews().value());
  protected readonly sorted = computed(() => sortReviews(this.list() ?? [], this.sort()));
  protected readonly shown = computed(() => this.sorted().slice(0, this.visible()));

  protected pick(value: string): void {
    const sort = REVIEW_SORTS.find((s) => s === value);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { reviewSort: sort === 'newest' ? null : sort },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
