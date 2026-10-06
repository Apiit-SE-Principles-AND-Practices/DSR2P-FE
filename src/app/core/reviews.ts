import type { Review } from './restaurant.service';

export const REVIEW_SORTS = ['newest', 'oldest', 'highest', 'lowest'] as const;
export type ReviewSort = (typeof REVIEW_SORTS)[number];

/** Sum of the three ratings; the same order as their average. */
const score = (r: Review) => r.foodQualityRating + r.serviceRating + r.miscRating;

const SORTERS: Record<ReviewSort, (a: Review, b: Review) => number> = {
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
  highest: (a, b) => score(b) - score(a),
  lowest: (a, b) => score(a) - score(b),
};

/** A sorted copy. Ties keep their newest-first order, since the backend lists newest first. The
 * backend only sorts by date, so the rating sorts are done here (it sends every review at once). */
export const sortReviews = (reviews: Review[], sort: ReviewSort): Review[] =>
  [...reviews].sort(SORTERS[sort]);

/** Average of the three ratings, to one decimal. */
export const reviewAverage = (r: Review): number => Math.round((score(r) / 3) * 10) / 10;

/** Only approved replies may be shown, whatever the API sends. */
export const approvedComments = (r: Review) => r.comments.filter((c) => c.status === 'Approved');
