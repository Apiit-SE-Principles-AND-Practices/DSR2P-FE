import * as z from 'zod/mini';

export const REVIEW_MAX = 2000;
const RATING_MESSAGE = 'Choose a rating from 1 to 5.';

/** A whole number from 1 to 5: nothing else can be sent, however the control is driven. */
export const ratingSchema = z
  .int(RATING_MESSAGE)
  .check(z.minimum(1, RATING_MESSAGE), z.maximum(5, RATING_MESSAGE));

/**
 * Mirrors the backend `CreateReviewInput` (ratings 1–5, non-blank text). The upper limit on the text
 * is ours: the backend has none. The restaurant id comes from the page, not the form.
 */
export const reviewSchema = z.object({
  foodQualityRating: ratingSchema,
  serviceRating: ratingSchema,
  miscRating: ratingSchema,
  reviewText: z
    .string()
    .check(
      z.trim(),
      z.minLength(1, 'Write your review.'),
      z.maxLength(REVIEW_MAX, `Use ${String(REVIEW_MAX)} characters or fewer.`),
    ),
  itemId: z.nullable(z.int()),
  language: z.enum(['en', 'si', 'ta']),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
