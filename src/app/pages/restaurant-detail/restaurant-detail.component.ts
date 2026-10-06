import { Component, DestroyRef, effect, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import type { ApiError } from '../../core/api.interceptor';
import { RestaurantService } from '../../core/restaurant.service';
import { InlineErrorComponent } from '../../shared/inline-error.component';
import { NotFoundComponent } from '../../shared/not-found.component';
import { SkeletonComponent } from '../../shared/skeleton.component';
import { RatingBreakdownComponent } from './rating-breakdown.component';
import { RestaurantHeaderComponent } from './restaurant-header.component';

/**
 * A restaurant's page. Each section loads on its own, so a slow one never blocks another: the header
 * and the rating breakdown start together. Menu (DSR2P-15) and reviews (DSR2P-16) join `.sections`.
 */
@Component({
  selector: 'app-restaurant-detail',
  imports: [
    InlineErrorComponent,
    NotFoundComponent,
    RatingBreakdownComponent,
    RestaurantHeaderComponent,
    SkeletonComponent,
  ],
  styleUrl: './restaurant-detail.component.css',
  template: `
    @let r = restaurant.value();
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
        <app-rating-breakdown [restaurantId]="id()" />
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

  protected readonly restaurant = rxResource({
    request: this.id,
    loader: ({ request }) => this.service.get(request),
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
