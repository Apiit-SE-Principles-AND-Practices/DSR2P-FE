import type { Review } from './restaurant.service';
import { approvedComments, reviewAverage, sortReviews } from './reviews';

const review = (
  id: number,
  createdAt: string,
  food: number,
  service: number,
  misc: number,
): Review => ({
  id,
  foodQualityRating: food,
  serviceRating: service,
  miscRating: misc,
  reviewText: `Review ${String(id)}`,
  language: 'en',
  createdAt,
  comments: [],
  response: null,
});

// Newest first, as the backend sends them.
const list = [
  review(3, '2026-10-03T10:00:00Z', 3, 3, 3), // 9
  review(2, '2026-10-02T10:00:00Z', 5, 5, 5), // 15
  review(1, '2026-10-01T10:00:00Z', 4, 4, 4), // 12
];
const ids = (reviews: Review[]) => reviews.map((r) => r.id);

describe('sortReviews', () => {
  it('US-76 most recent first', () => {
    expect(ids(sortReviews(list, 'newest'))).toEqual([3, 2, 1]);
  });

  it('US-77 oldest first', () => {
    expect(ids(sortReviews(list, 'oldest'))).toEqual([1, 2, 3]);
  });

  it('US-78 highest rated first', () => {
    expect(ids(sortReviews(list, 'highest'))).toEqual([2, 1, 3]);
  });

  it('US-79 lowest rated first', () => {
    expect(ids(sortReviews(list, 'lowest'))).toEqual([3, 1, 2]);
  });

  it('keeps newest first among equal ratings, and never changes the original list', () => {
    const tied = [
      review(2, '2026-10-02T10:00:00Z', 4, 4, 4),
      review(1, '2026-10-01T10:00:00Z', 4, 4, 4),
    ];
    expect(ids(sortReviews(tied, 'highest'))).toEqual([2, 1]);
    sortReviews(list, 'oldest');
    expect(ids(list)).toEqual([3, 2, 1]);
  });
});

describe('reviewAverage', () => {
  it('averages the three ratings to one decimal', () => {
    expect(reviewAverage(review(1, '2026-10-01T10:00:00Z', 5, 4, 4))).toBe(4.3);
  });
});

describe('approvedComments', () => {
  it('drops Pending and Rejected replies, whatever the API sends', () => {
    const comment = (id: number, status: 'Pending' | 'Approved' | 'Rejected') => ({
      id,
      commentText: 'x',
      status,
      createdAt: '2026-10-01T10:00:00Z',
    });
    const r = {
      ...list[0],
      comments: [comment(1, 'Approved'), comment(2, 'Pending'), comment(3, 'Rejected')],
    };
    expect(approvedComments(r).map((c) => c.id)).toEqual([1]);
  });
});
