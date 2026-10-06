import { toEntries, withoutEntry, type ModerationQueue } from './moderation';

const review = (id: number, createdAt: string, reportCount = 0) => ({
  id,
  restaurantId: 'r-1',
  foodQualityRating: 4,
  serviceRating: 3,
  miscRating: 5,
  reviewText: `Review ${String(id)}`,
  language: 'en' as const,
  status: 'Pending' as const,
  createdAt,
  comments: [],
  response: null,
  reportCount,
});
const comment = (id: number, reviewId: number, createdAt: string) => ({
  id,
  reviewId,
  commentText: `Reply ${String(id)}`,
  status: 'Pending' as const,
  createdAt,
});

const queue: ModerationQueue = {
  reviews: [review(1, '2026-10-01T10:00:00Z'), review(2, '2026-10-03T10:00:00Z', 1)],
  comments: [comment(7, 1, '2026-10-02T10:00:00Z'), comment(8, 99, '2026-10-04T10:00:00Z')],
};

describe('toEntries', () => {
  it('puts reported items first, then the rest oldest first', () => {
    expect(toEntries(queue).map((e) => e.key)).toEqual([
      'reviews-2',
      'reviews-1',
      'comments-7',
      'comments-8',
    ]);
  });

  it('gives a reply its parent review text when that review is in the queue', () => {
    const entries = toEntries(queue);
    expect(entries.find((e) => e.key === 'comments-7')?.parentText).toBe('Review 1');
    expect(entries.find((e) => e.key === 'comments-8')?.parentText).toBeUndefined();
  });

  it('flags reported items and carries the ratings of a review', () => {
    const [first] = toEntries(queue);
    expect(first.reported).toBeTrue();
    expect(first.ratings).toEqual({ food: 4, service: 3, other: 5 });
  });
});

describe('withoutEntry', () => {
  it('removes only that review or reply', () => {
    expect(withoutEntry(queue, 'reviews', 1).reviews.map((r) => r.id)).toEqual([2]);
    expect(withoutEntry(queue, 'comments', 7).comments.map((c) => c.id)).toEqual([8]);
    expect(withoutEntry(queue, 'comments', 7).reviews.length).toBe(2);
  });
});
