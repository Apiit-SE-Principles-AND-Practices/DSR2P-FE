import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { SearchResult } from './search.service';

/** The three 1–5 ratings of a review. Grows into the full review (text, replies, photo) in DSR2P-16. */
export interface Review {
  foodQualityRating: number;
  serviceRating: number;
  miscRating: number;
}

@Injectable({ providedIn: 'root' })
export class RestaurantService {
  private readonly http = inject(HttpClient);

  get(id: string): Observable<SearchResult> {
    return this.http.get<SearchResult>(`/restaurants/${id}`);
  }

  /** Approved reviews only: the backend's default, so Pending and Rejected never reach the page. */
  reviews(id: string): Observable<Review[]> {
    return this.http.get<Review[]>(`/restaurants/${id}/reviews`);
  }
}
