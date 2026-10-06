import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionStore } from '../../core/session.store';
import type { SearchResult } from '../../core/search.service';
import { PriceBandComponent } from '../../shared/price-band.component';
import { RatingDisplayComponent } from '../../shared/rating-display.component';
import { WriteReviewButtonComponent } from './write-review-button.component';

@Component({
  selector: 'app-restaurant-header',
  imports: [PriceBandComponent, RatingDisplayComponent, RouterLink, WriteReviewButtonComponent],
  styleUrl: './restaurant-header.component.css',
  template: `
    @let r = restaurant();
    @if (r.imageUrl) {
      <img class="hero" alt="" width="1200" height="400" [src]="r.imageUrl" />
    } @else {
      <div class="hero" aria-hidden="true"></div>
    }
    <h1>{{ r.name }}</h1>
    <p class="meta">{{ categories() }}</p>
    <p class="meta">{{ r.address }}, {{ r.city }}</p>
    <p class="row">
      <app-rating-display [rating]="r.averageRating" />
      <app-price-band [band]="r.priceBand" />
    </p>
    <app-write-review-button [restaurantId]="r.id" />
    @if (isAdmin()) {
      <a class="btn secondary" [routerLink]="['/admin/restaurants', r.id, 'edit']"
        >Edit restaurant</a
      >
    }
  `,
})
export class RestaurantHeaderComponent {
  readonly restaurant = input.required<SearchResult>();
  /** Only an Admin is offered the edit link; the server enforces it too. */
  private readonly session = inject(SessionStore);
  protected readonly isAdmin = computed(() => this.session.role() === 'Admin');

  protected readonly categories = computed(() =>
    this.restaurant()
      .categories.map(({ name }) => name)
      .join(', '),
  );
}
