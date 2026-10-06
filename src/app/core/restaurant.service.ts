import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { MenuItem } from './menu';
import type { Language } from './session.store';
import type { ReviewInput } from '../shared/validation/review.schema';
import type { SearchResult } from './search.service';

export interface ReviewComment {
  id: number;
  /** Who wrote it (the API sends the id, not a name). */
  userId?: string;
  /** How many people reported it. */
  reportCount?: number;
  commentText: string;
  /** The backend currently sends every comment, so only Approved ones may be shown. */
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
}

/** Mirrors the OpenAPI `Review`. There is no author name or like count in the API. */
export interface Review {
  id: number;
  userId?: string;
  reportCount?: number;
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

  /** Sent as multipart form data (the photo goes in the same request as the `images` file). Starts as Pending. */
  submitReview(
    restaurantId: string,
    { itemId, ...fields }: ReviewInput,
    photo: File | null = null,
  ): Observable<Review> {
    const form = new FormData();
    Object.entries({ restaurantId, ...fields, ...(itemId !== null && { itemId }) }).forEach(
      ([name, value]) => {
        form.append(name, String(value));
      },
    );
    if (photo) form.append('images', photo, photo.name);
    return this.http.post<Review>('/reviews', form);
  }

  /** A reply to a review. It starts as Pending, so it is not shown until a moderator approves it. */
  reply(reviewId: number, commentText: string): Observable<ReviewComment> {
    return this.http.post<ReviewComment>(`/reviews/${String(reviewId)}/comments`, { commentText });
  }

  /** The restaurant's one response to a review (Admin only). Public at once; a second one is a 409. */
  respond(reviewId: number, responseText: string): Observable<unknown> {
    return this.http.post(`/reviews/${String(reviewId)}/response`, { responseText });
  }

  /** Tells the moderators about a review or reply. The API takes no reason or body. */
  report(kind: 'reviews' | 'comments', id: number): Observable<unknown> {
    return this.http.post(`/${kind}/${String(id)}/report`, null);
  }

  /** Approved reviews only: the backend's default, so Pending and Rejected never reach the page. */
  reviews(id: string): Observable<Review[]> {
    return this.http.get<Review[]>(`/restaurants/${id}/reviews`);
  }
}
