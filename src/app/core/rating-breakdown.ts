import type { Review } from './restaurant.service';

type Ratings = Pick<Review, 'foodQualityRating' | 'serviceRating' | 'miscRating'>;

export interface RatingBreakdown {
  count: number;
  food: number;
  service: number;
  misc: number;
}

const average = (values: number[]): number =>
  values.length === 0
    ? 0
    : Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;

/**
 * Average of each rating dimension over the approved reviews (one decimal). The backend only sends
 * the overall average, so the breakdown is derived here; if it ever adds one, display that instead.
 */
export const ratingBreakdown = (reviews: Ratings[]): RatingBreakdown => ({
  count: reviews.length,
  food: average(reviews.map((r) => r.foodQualityRating)),
  service: average(reviews.map((r) => r.serviceRating)),
  misc: average(reviews.map((r) => r.miscRating)),
});
