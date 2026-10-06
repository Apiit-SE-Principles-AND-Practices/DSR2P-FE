import { ratingSchema, REVIEW_MAX, reviewSchema } from './review.schema';

describe('ratingSchema (NFR-04)', () => {
  [1, 2, 3, 4, 5].forEach((value) => {
    it(`accepts ${String(value)}`, () => {
      expect(ratingSchema.safeParse(value).success).toBeTrue();
    });
  });

  // 0 and 6 are the boundaries just outside the range.
  [0, 6, -1, 3.5, null, undefined, '4', NaN].forEach((value) => {
    it(`rejects ${String(value)}`, () => {
      expect(ratingSchema.safeParse(value).success).toBeFalse();
    });
  });
});

describe('reviewSchema', () => {
  const valid = {
    foodQualityRating: 5,
    serviceRating: 4,
    miscRating: 3,
    reviewText: 'Great food.',
    itemId: null,
    language: 'en',
  };
  const errorOn = (field: string, overrides: object) =>
    reviewSchema
      .safeParse({ ...valid, ...overrides })
      .error?.issues.find((i) => i.path[0] === field)?.message;

  it('accepts a complete review, with or without a dish', () => {
    expect(reviewSchema.safeParse(valid).success).toBeTrue();
    expect(reviewSchema.safeParse({ ...valid, itemId: 12 }).success).toBeTrue();
  });

  it('trims the text', () => {
    expect(reviewSchema.parse({ ...valid, reviewText: '  Nice  ' }).reviewText).toBe('Nice');
  });

  it('requires every rating', () => {
    expect(errorOn('foodQualityRating', { foodQualityRating: null })).toBe(
      'Choose a rating from 1 to 5.',
    );
    expect(errorOn('serviceRating', { serviceRating: 0 })).toBe('Choose a rating from 1 to 5.');
    expect(errorOn('miscRating', { miscRating: 6 })).toBe('Choose a rating from 1 to 5.');
  });

  it('requires text that is not blank', () => {
    expect(errorOn('reviewText', { reviewText: '' })).toBe('Write your review.');
    expect(errorOn('reviewText', { reviewText: '   \n ' })).toBe('Write your review.');
  });

  it('limits the length of the text', () => {
    expect(
      reviewSchema.safeParse({ ...valid, reviewText: 'a'.repeat(REVIEW_MAX) }).success,
    ).toBeTrue();
    expect(errorOn('reviewText', { reviewText: 'a'.repeat(REVIEW_MAX + 1) })).toContain(
      'characters or fewer',
    );
  });
});
