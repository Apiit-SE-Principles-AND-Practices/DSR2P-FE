import type { Review, ReviewComment } from './restaurant.service';
import type { Language } from './session.store';

/** Same words as the API paths and the dashboard links (`/admin/moderation?type=reviews`). */
export type ModerationKind = 'reviews' | 'comments';

/** Mirrors the OpenAPI queue: every Pending review and comment, oldest first. */
export interface ModerationQueue {
  reviews: (Review & { restaurantId: string; reportCount?: number })[];
  comments: (ReviewComment & { reviewId: number; reportCount?: number })[];
}

/** A review or reply, in the one shape the queue shows. */
export interface ModerationEntry {
  key: string;
  kind: ModerationKind;
  id: number;
  createdAt: string;
  text: string;
  language?: Language;
  reported: boolean;
  restaurantId?: string;
  ratings?: { food: number; service: number; other: number };
  photos: string[];
  /** For a reply: the review it answers, when that review is in the queue too (the API sends no other). */
  parentText?: string;
}

const entryKey = (kind: ModerationKind, id: number): string => `${kind}-${String(id)}`;

/** Reported items first (they were already approved once), then oldest first: first in, first decided. */
export function toEntries({ reviews, comments }: ModerationQueue): ModerationEntry[] {
  const fromReviews = reviews.map((r): ModerationEntry => ({
    key: entryKey('reviews', r.id),
    kind: 'reviews',
    id: r.id,
    createdAt: r.createdAt,
    text: r.reviewText,
    language: r.language,
    reported: (r.reportCount ?? 0) > 0,
    restaurantId: r.restaurantId,
    ratings: { food: r.foodQualityRating, service: r.serviceRating, other: r.miscRating },
    photos: (r.images ?? []).map((image) => image.imageUrl),
  }));
  const fromComments = comments.map((c): ModerationEntry => {
    const parent = reviews.find((r) => r.id === c.reviewId);
    return {
      key: entryKey('comments', c.id),
      kind: 'comments',
      id: c.id,
      createdAt: c.createdAt,
      text: c.commentText,
      language: parent?.language,
      reported: (c.reportCount ?? 0) > 0,
      photos: [],
      parentText: parent?.reviewText,
    };
  });
  return [...fromReviews, ...fromComments].sort(
    (a, b) => Number(b.reported) - Number(a.reported) || a.createdAt.localeCompare(b.createdAt),
  );
}

/** The queue without one item (used only once the server has confirmed the decision). */
export const withoutEntry = (
  queue: ModerationQueue,
  kind: ModerationKind,
  id: number,
): ModerationQueue => ({
  reviews: kind === 'reviews' ? queue.reviews.filter((r) => r.id !== id) : queue.reviews,
  comments: kind === 'comments' ? queue.comments.filter((c) => c.id !== id) : queue.comments,
});
