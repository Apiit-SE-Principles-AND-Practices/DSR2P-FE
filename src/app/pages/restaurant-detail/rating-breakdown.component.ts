import { Component, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ratingBreakdown } from '../../core/rating-breakdown';
import { RestaurantService } from '../../core/restaurant.service';
import { InlineErrorComponent } from '../../shared/inline-error.component';
import { RatingBarComponent } from '../../shared/rating-bar.component';
import { SkeletonComponent } from '../../shared/skeleton.component';

/** Food, service and other ratings from the approved reviews. Loads on its own, apart from the header. */
@Component({
  selector: 'app-rating-breakdown',
  imports: [InlineErrorComponent, RatingBarComponent, SkeletonComponent],
  template: `
    <section aria-labelledby="breakdown-title">
      <h2 id="breakdown-title">Ratings</h2>
      @let b = reviews.value();
      @if (reviews.error()) {
        <app-inline-error message="Could not load ratings." (retry)="reviews.reload()" />
      } @else if (b) {
        @if (b.count === 0) {
          <p>No approved reviews yet — be the first to write one.</p>
        } @else {
          <p>Based on {{ b.count }} approved {{ b.count === 1 ? 'review' : 'reviews' }}.</p>
          <app-rating-bar label="Food quality" [value]="b.food" />
          <app-rating-bar label="Service" [value]="b.service" />
          <app-rating-bar label="Other" [value]="b.misc" />
        }
      } @else {
        <app-skeleton height="var(--space-12)" />
      }
    </section>
  `,
})
export class RatingBreakdownComponent {
  readonly restaurantId = input.required<string>();
  private readonly service = inject(RestaurantService);

  protected readonly reviews = rxResource({
    request: this.restaurantId,
    loader: ({ request }) => this.service.reviews(request).pipe(map(ratingBreakdown)),
  });
}
