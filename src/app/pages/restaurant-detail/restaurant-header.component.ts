import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { RequireLogin } from '../../core/require-login';
import type { SearchResult } from '../../core/search.service';
import { PriceBandComponent } from '../../shared/price-band.component';
import { RatingDisplayComponent } from '../../shared/rating-display.component';

@Component({
  selector: 'app-restaurant-header',
  imports: [PriceBandComponent, RatingDisplayComponent],
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
    <button type="button" class="btn" (click)="writeReview()">Write a review</button>
  `,
})
export class RestaurantHeaderComponent {
  readonly restaurant = input.required<SearchResult>();
  private readonly requireLogin = inject(RequireLogin);
  private readonly router = inject(Router);

  protected readonly categories = computed(() =>
    this.restaurant()
      .categories.map(({ name }) => name)
      .join(', '),
  );

  /** Guests get the login prompt; the review form itself arrives with DSR2P-17. */
  protected writeReview(): void {
    this.requireLogin.run('Log in to write a review.', () => {
      void this.router.navigate(['/restaurants', this.restaurant().id, 'review']);
    });
  }
}
