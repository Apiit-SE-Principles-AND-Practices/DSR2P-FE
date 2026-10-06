import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { MyComment, MyReview } from '../../core/account.service';
import { MyReviewsComponent } from './my-reviews.component';

const review = (
  id: number,
  status: MyReview['status'],
  reason: string | null = null,
): MyReview => ({
  id,
  restaurantId: 'r-1',
  status,
  rejectionReason: reason,
  foodQualityRating: 4,
  serviceRating: 4,
  miscRating: 4,
  reviewText: `My review ${String(id)}`,
  language: 'en',
  createdAt: `2026-10-0${String(id)}T12:00:00Z`,
  comments: [],
  response: null,
});
const comment = (
  id: number,
  status: MyComment['status'],
  reason: string | null = null,
): MyComment => ({
  id,
  reviewId: 10,
  status,
  rejectionReason: reason,
  commentText: `My reply ${String(id)}`,
  createdAt: `2026-10-0${String(id)}T12:00:00Z`,
});
const mixed = [
  review(3, 'Rejected', 'Personal attack'),
  review(2, 'Approved'),
  review(1, 'Pending'),
];

function setup() {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  });
  const backend = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(MyReviewsComponent);
  const el = fixture.nativeElement as HTMLElement;
  const settle = () => {
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
  };
  /** Answers whatever the page asked for: the list of the open tab, plus the restaurant names. */
  const answer = async (list: object, status = 200) => {
    const urls = ['/users/me/reviews', '/users/me/comments'];
    backend
      .match((r) => urls.some((u) => r.url.endsWith(u)))
      .forEach((r) => {
        r.flush(list, { status, statusText: 'x' });
      });
    backend
      .match((r) => r.url.endsWith('/restaurants'))
      .forEach((r) => {
        r.flush({
          data: r.request.params.get('city') === 'Galle' ? [{ id: 'r-1', name: 'Sea Spray' }] : [],
        });
      });
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const rows = () => Array.from(el.querySelectorAll('app-account-item-row'));
  const text = (row: Element) => row.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const chooseTab = (label: string) => {
    Array.from(el.querySelectorAll('label.segment'))
      .find((l) => l.textContent?.includes(label))
      ?.querySelector('input')
      ?.click();
    settle();
  };
  const filterBy = (value: string) => {
    const select = el.querySelector('select');
    if (!select) throw new Error('No status select');
    select.value = value;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };
  return { el, fixture, backend, settle, answer, rows, text, chooseTab, filterBy };
}

describe('MyReviewsComponent', () => {
  it('shows every status with its own badge, newest first, with the restaurant name linked', async () => {
    const { settle, answer, rows, text } = setup();
    settle();
    await answer(mixed);
    expect(rows().map((r) => text(r))).toEqual([
      jasmine.stringContaining('Rejected'),
      jasmine.stringContaining('Published'),
      jasmine.stringContaining('Pending review'),
    ]);
    expect(text(rows()[0])).toContain('Review of Sea Spray');
    expect(rows()[0].querySelector('a')?.getAttribute('href')).toBe('/restaurants/r-1');
  });

  it('shows the moderator’s reason under a rejected review only', async () => {
    const { settle, answer, rows } = setup();
    settle();
    await answer(mixed);
    expect(rows()[0].querySelector('.reason')?.textContent).toBe('Reason: Personal attack');
    expect(rows()[1].querySelector('.reason')).toBeNull();
    expect(rows()[2].querySelector('.reason')).toBeNull();
  });

  it('falls back to "No reason recorded" rather than hiding a rejected review', async () => {
    const { settle, answer, rows } = setup();
    settle();
    await answer([review(1, 'Rejected', null)]);
    expect(rows().length).toBe(1);
    expect(rows()[0].querySelector('.reason')?.textContent).toBe('Reason: No reason recorded');
  });

  it('the status filter narrows the list, and "All" brings everything back', async () => {
    const { settle, answer, rows, filterBy, el } = setup();
    settle();
    await answer(mixed);
    filterBy('Pending');
    expect(rows().length).toBe(1);
    expect(rows()[0].textContent).toContain('Pending review');
    filterBy('Approved');
    expect(rows()[0].textContent).toContain('Published');
    filterBy('all');
    expect(rows().length).toBe(3);
    filterBy('Rejected');
    expect(el.querySelector('select')?.value).toBe('Rejected');
  });

  it('says so when nothing has the chosen status', async () => {
    const { el, settle, answer, rows, filterBy } = setup();
    settle();
    await answer([review(1, 'Approved')]);
    filterBy('Rejected');
    expect(rows().length).toBe(0);
    expect(el.textContent).toContain('None of your reviews have this status.');
  });

  it('shows a friendly empty state when there are no reviews at all', async () => {
    const { el, settle, answer } = setup();
    settle();
    await answer([]);
    expect(el.textContent).toContain('You haven’t written any reviews yet.');
  });

  describe('Replies tab', () => {
    it('loads and shows the replies with their statuses and reasons', async () => {
      const { backend, settle, answer, chooseTab, rows, text } = setup();
      settle();
      await answer([]);
      chooseTab('Replies');
      backend.expectNone((r) => r.url.endsWith('/users/me/reviews')); // only the open tab is requested
      await answer([comment(2, 'Rejected', 'Off topic'), comment(1, 'Pending')]);
      expect(rows().map((r) => text(r))).toEqual([
        jasmine.stringContaining('Reply to a review'),
        jasmine.stringContaining('Reply to a review'),
      ]);
      expect(rows()[0].querySelector('.reason')?.textContent).toBe('Reason: Off topic');
      expect(rows()[0].querySelector('a')).toBeNull(); // the API gives no restaurant for a reply
    });

    it('has its own empty state', async () => {
      const { el, settle, answer, chooseTab } = setup();
      settle();
      await answer([]);
      chooseTab('Replies');
      await answer([]);
      expect(el.textContent).toContain('You haven’t written any replies yet.');
    });
  });

  it('shows an error with Retry that fetches again', async () => {
    const { el, fixture, settle, answer, backend, rows } = setup();
    settle();
    await answer({}, 500);
    expect(el.querySelector('[role=alert]')?.textContent).toContain('Could not load your content.');
    el.querySelector<HTMLButtonElement>('[role=alert] button')?.click();
    settle();
    backend.expectOne((r) => r.url.endsWith('/users/me/reviews')).flush([review(1, 'Approved')]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(rows().length).toBe(1);
  });

  it('shows a skeleton while loading', () => {
    const { el, settle } = setup();
    settle();
    expect(el.querySelectorAll('app-skeleton').length).toBe(1);
  });
});
