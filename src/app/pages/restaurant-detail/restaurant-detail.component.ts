import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import type { ApiError } from '../../core/api.interceptor';
import { RestaurantService } from '../../core/restaurant.service';
import { InlineErrorComponent } from '../../shared/inline-error.component';
import { NotFoundComponent } from '../../shared/not-found.component';
import { SkeletonComponent } from '../../shared/skeleton.component';
import { MenuSectionComponent } from './menu-section.component';
import { RatingBreakdownComponent } from './rating-breakdown.component';
import { RestaurantHeaderComponent } from './restaurant-header.component';
import { ReviewsSectionComponent } from './reviews-section.component';

/**
 * A restaurant's page. Each section loads on its own, so a slow one never blocks another: the header
 * and the ratings/reviews column start together.
 */
@Component({
  selector: 'app-restaurant-detail',
  imports: [
    InlineErrorComponent,
    MenuSectionComponent,
    NotFoundComponent,
    RatingBreakdownComponent,
    RestaurantHeaderComponent,
    ReviewsSectionComponent,
    SkeletonComponent,
  ],
  styleUrl: './restaurant-detail.component.css',
  template: `
    @let r = restaurant.value();
    @if (submitted()) {
      <div class="notice" role="status">
        <span
          >Thanks — your review has been submitted and will appear once a moderator approves
          it.</span
        >
        <button type="button" class="btn secondary" (click)="submitted.set(false)">Dismiss</button>
      </div>
    }
    @if (restaurant.error()) {
      @if (notFound()) {
        <app-not-found />
      } @else {
        <app-inline-error message="Could not load this restaurant." (retry)="restaurant.reload()" />
      }
    } @else {
      @if (r) {
        <app-restaurant-header [restaurant]="r" />
      } @else {
        <app-skeleton height="var(--space-12)" />
      }
      <div class="sections">
        <app-menu-section [restaurantId]="id()" />
        <div class="column">
          <app-rating-breakdown [reviews]="reviews" />
          <app-reviews-section [reviews]="reviews" [restaurantId]="id()" />
        </div>
      </div>
    }
  `,
})
export class RestaurantDetailComponent {
  private readonly service = inject(RestaurantService);
  protected readonly id = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('id') ?? '')),
    { requireSync: true },
  );

  /** Set by the review form after a successful submit (router state, so it is not in the URL). */
  protected readonly submitted = signal(
    (history.state as { reviewSubmitted?: boolean } | null)?.reviewSubmitted === true,
  );

  protected readonly restaurant = rxResource({
    request: this.id,
    loader: ({ request }) => this.service.get(request),
  });

  /** One request feeds both the rating bars and the review list. */
  protected readonly reviews = rxResource({
    request: this.id,
    loader: ({ request }) => this.service.reviews(request),
  });

  /** A well-formed id nobody owns is a 404; a malformed one is rejected with 400. Both mean "no such page". */
  protected notFound(): boolean {
    const status = (this.restaurant.error() as Partial<ApiError> | undefined)?.status;
    return status === 404 || status === 400;
  }

  constructor() {
    const title = inject(Title);
    const previous = title.getTitle();
    effect(() => {
      const name = this.restaurant.value()?.name;
      if (name) title.setTitle(`${name} · Ruchi`);
    });
    inject(DestroyRef).onDestroy(() => {
      title.setTitle(previous);
    });
  }
}
