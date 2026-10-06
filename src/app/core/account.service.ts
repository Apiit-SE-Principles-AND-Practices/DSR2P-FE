import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, shareReplay, type Observable } from 'rxjs';
import type { Review, ReviewComment } from './restaurant.service';
import { CITIES } from './search-params.service';
import { SessionStore } from './session.store';

export type ModerationStatus = ReviewComment['status'];

/** The signed-in user's own review, in any status. A rejected one carries the moderator's reason. */
export interface MyReview extends Review {
  restaurantId: string;
  status: ModerationStatus;
  rejectionReason: string | null;
}

export interface MyComment extends ReviewComment {
  reviewId: number;
  rejectionReason: string | null;
}

/** Everything the user has written, newest first. The API cannot filter by status, so callers do. */
@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionStore);

  myReviews(): Observable<MyReview[]> {
    return this.http.get<MyReview[]>('/users/me/reviews');
  }

  myComments(): Observable<MyComment[]> {
    return this.http.get<MyComment[]>('/users/me/comments');
  }

  /** Restaurant names by id (reviews only carry the id), from the three cities' lists, fetched once. */
  readonly restaurantNames$ = forkJoin(
    CITIES.map((city) =>
      this.http.get<{ data: { id: string; name: string }[] }>('/restaurants', {
        params: { city, pageSize: 100 },
      }),
    ),
  ).pipe(
    map(
      (pages) =>
        new Map(pages.flatMap(({ data }) => data.map(({ id, name }) => [id, name] as const))),
    ),
    shareReplay(1),
  );

  /** How much content goes with the account (the API has no summary, so this counts the lists). */
  counts(): Observable<{ reviews: number; replies: number }> {
    return forkJoin({ reviews: this.myReviews(), replies: this.myComments() }).pipe(
      map(({ reviews, replies }) => ({ reviews: reviews.length, replies: replies.length })),
    );
  }

  /** Everything held about the user. The API has no export endpoint, so it is gathered from what it offers. */
  exportData(): Observable<object> {
    return forkJoin({ reviews: this.myReviews(), comments: this.myComments() }).pipe(
      map((content) => ({
        exportedAt: new Date().toISOString(),
        profile: this.session.user(),
        ...content,
      })),
    );
  }

  /** The API takes no password for this; the page asks for a typed confirmation instead. */
  deleteAccount(): Observable<unknown> {
    return this.http.delete('/users/me');
  }
}
