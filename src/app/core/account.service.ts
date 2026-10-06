import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, shareReplay, type Observable } from 'rxjs';
import type { Review, ReviewComment } from './restaurant.service';
import { CITIES } from './search-params.service';

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
}
