import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { MenuItem } from './menu';
import type { Language } from './session.store';
import type { ReviewInput } from '../shared/validation/review.schema';
import type { SearchResult } from './search.service';

export interface ReviewComment {
  id: number;
  commentText: string;
  /** The backend currently sends every comment, so only Approved ones may be shown. */
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
}

/** Mirrors the OpenAPI `Review`. There is no author name or like count in the API. */
export interface Review {
  id: number;
  foodQualityRating: number;
  serviceRating: number;
  miscRating: number;
  reviewText: string;
  language: Language;
  createdAt: string;
  /** In the spec, but the endpoint does not send it yet. */
  images?: { id: number; imageUrl: string }[];
  comments: ReviewComment[];
  response: { responseText: string; createdAt: string } | null;
}

@Injectable({ providedIn: 'root' })
export class RestaurantService {
  private readonly http = inject(HttpClient);

  get(id: string): Observable<SearchResult> {
    return this.http.get<SearchResult>(`/restaurants/${id}`);
  }

  /** Never served from a cache, so a price an Admin just changed is what customers see. */
  menu(id: string): Observable<MenuItem[]> {
    return this.http.get<MenuItem[]>(`/restaurants/${id}/menu`, {
      headers: { 'Cache-Control': 'no-cache' },
    });
  }

  /** Sent as multipart form data (the endpoint also takes photos, added in DSR2P-21). Starts as Pending. */
  submitReview(restaurantId: string, { itemId, ...fields }: ReviewInput): Observable<Review> {
    const form = new FormData();
    Object.entries({ restaurantId, ...fields, ...(itemId !== null && { itemId }) }).forEach(
      ([name, value]) => {
        form.append(name, String(value));
      },
    );
    return this.http.post<Review>('/reviews', form);
  }

  /** Approved reviews only: the backend's default, so Pending and Rejected never reach the page. */
  reviews(id: string): Observable<Review[]> {
    return this.http.get<Review[]>(`/restaurants/${id}/reviews`);
  }
}
