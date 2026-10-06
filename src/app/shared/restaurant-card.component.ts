import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { SearchResult } from '../core/search.service';
import { PriceBandComponent } from './price-band.component';
import { RatingDisplayComponent } from './rating-display.component';

/** One result. The whole card is a single link, so nothing interactive is nested inside it. */
@Component({
  selector: 'app-restaurant-card',
  imports: [RouterLink, RatingDisplayComponent, PriceBandComponent],
  styleUrl: './restaurant-card.component.css',
  template: `
    @let r = restaurant();
    <a class="card" [routerLink]="['/restaurants', r.id]">
      @if (r.imageUrl) {
        <img class="photo" loading="lazy" alt="" width="320" height="180" [src]="r.imageUrl" />
      } @else {
        <div class="photo" aria-hidden="true"></div>
      }
      <div class="body">
        <strong class="name" [title]="r.name">{{ r.name }}</strong>
        <span class="meta">{{ r.city }} · {{ categories() }}</span>
        <span class="row">
          <app-rating-display [rating]="r.averageRating" />
          <app-price-band [band]="r.priceBand" />
        </span>
      </div>
    </a>
  `,
})
export class RestaurantCardComponent {
  readonly restaurant = input.required<SearchResult>();
  protected readonly categories = computed(() =>
    this.restaurant()
      .categories.map(({ name }) => name)
      .join(', '),
  );
}
