import { ratingBreakdown } from './rating-breakdown';

const review = (foodQualityRating: number, serviceRating: number, miscRating: number) => ({
  foodQualityRating,
  serviceRating,
  miscRating,
});

describe('ratingBreakdown', () => {
  it('averages each dimension separately, to one decimal', () => {
    expect(ratingBreakdown([review(5, 4, 3), review(4, 4, 4), review(4, 3, 2)])).toEqual({
      count: 3,
      food: 4.3,
      service: 3.7,
      misc: 3,
    });
  });

  it('is the review itself when there is only one', () => {
    expect(ratingBreakdown([review(5, 4, 4)])).toEqual({ count: 1, food: 5, service: 4, misc: 4 });
  });

  it('is all zeros, never NaN, with no reviews', () => {
    expect(ratingBreakdown([])).toEqual({ count: 0, food: 0, service: 0, misc: 0 });
  });
});
