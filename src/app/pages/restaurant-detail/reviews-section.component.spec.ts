import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal, type ResourceRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { Review } from '../../core/restaurant.service';
import { SessionStore } from '../../core/session.store';
import { ReviewsSectionComponent } from './reviews-section.component';

const review = (id: number, day: number, ratings: [number, number, number]): Review => ({
  id,
  foodQualityRating: ratings[0],
  serviceRating: ratings[1],
  miscRating: ratings[2],
  reviewText: `Review ${String(id)}`,
  language: 'en',
  createdAt: `2026-10-${String(day).padStart(2, '0')}T12:00:00Z`,
  comments: [],
  response: null,
});

/** Stands in for the page's reviews resource. */
function fakeResource(value: Review[] | undefined, error?: unknown) {
  const reload = jasmine.createSpy('reload');
  const ref = { value: signal(value), error: signal(error), reload } as unknown as ResourceRef<
    Review[] | undefined
  >;
  return { ref, reload };
}

const loadMore = (el: HTMLElement) =>
  Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Load more');

let current: ResourceRef<Review[] | undefined>;

@Component({
  imports: [ReviewsSectionComponent],
  template: '<app-reviews-section [reviews]="reviews" restaurantId="r-1" />',
})
class HostComponent {
  protected readonly reviews = current;
}

async function open(value: Review[] | undefined, error?: unknown, url = '/restaurants/r-1') {
  const resource = fakeResource(value, error);
  current = resource.ref;
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'restaurants/:id', component: HostComponent }]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  const el = harness.routeNativeElement;
  if (!el) throw new Error('Host did not render');
  const texts = () =>
    Array.from(el.querySelectorAll('app-review-card .text:not(.response .text)')).map(
      (t) => t.textContent,
    );
  const choose = async (value: string) => {
    const select = el.querySelector('select');
    if (!select) throw new Error('No sort select');
    select.value = value;
    select.dispatchEvent(new Event('change'));
    await harness.fixture.whenStable();
    harness.detectChanges();
  };
  return { el, harness, texts, choose, router: TestBed.inject(Router), reload: resource.reload };
}

// Newest first, as the backend sends them.
const list = [review(3, 3, [3, 3, 3]), review(2, 2, [5, 5, 5]), review(1, 1, [4, 4, 4])];

describe('ReviewsSectionComponent', () => {
  it('shows the count and the reviews, most recent first', async () => {
    const { el, texts } = await open(list);
    expect(el.querySelector('h2')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Reviews (3)');
    expect(texts()).toEqual(['Review 3', 'Review 2', 'Review 1']);
  });

  it('US-76/77 — sorting by date reorders the list and is kept in the URL', async () => {
    const { texts, choose, router } = await open(list);
    await choose('oldest');
    expect(texts()).toEqual(['Review 1', 'Review 2', 'Review 3']);
    expect(router.url).toBe('/restaurants/r-1?reviewSort=oldest');
  });

  it('US-78/79 — sorting by rating reorders the list', async () => {
    const { texts, choose } = await open(list);
    await choose('highest');
    expect(texts()).toEqual(['Review 2', 'Review 1', 'Review 3']);
    await choose('lowest');
    expect(texts()).toEqual(['Review 3', 'Review 1', 'Review 2']);
  });

  it('returns to the default and drops the URL param when Most recent is chosen again', async () => {
    const { choose, router } = await open(list);
    await choose('highest');
    await choose('newest');
    expect(router.url).toBe('/restaurants/r-1');
  });

  it('shows the sort from the URL, e.g. on a shared link', async () => {
    const { el, texts } = await open(list, undefined, '/restaurants/r-1?reviewSort=lowest');
    expect(el.querySelector('select')?.value).toBe('lowest');
    expect(texts()).toEqual(['Review 3', 'Review 1', 'Review 2']);
  });

  it('ignores an unknown sort in the URL', async () => {
    const { texts } = await open(list, undefined, '/restaurants/r-1?reviewSort=best');
    expect(texts()).toEqual(['Review 3', 'Review 2', 'Review 1']);
  });

  it('loads ten at a time with a Load more button', async () => {
    const many = Array.from({ length: 12 }, (_, i) => review(12 - i, 12 - i, [4, 4, 4]));
    const { el, harness } = await open(many);
    expect(el.querySelectorAll('app-review-card').length).toBe(10);
    loadMore(el)?.click();
    harness.detectChanges();
    expect(el.querySelectorAll('app-review-card').length).toBe(12);
    expect(loadMore(el)).toBeUndefined();
  });

  it('shows the empty state with a Write a review call to action', async () => {
    const { el } = await open([]);
    expect(el.textContent).toContain('No approved reviews yet.');
    expect(el.querySelector('select')).toBeNull();
    expect(el.querySelector('app-write-review-button button')?.textContent).toBe('Write a review');
  });

  it('shows an error with Retry', async () => {
    const { el, reload } = await open(undefined, new Error('x'));
    expect(el.querySelector('[role=alert]')?.textContent).toContain('Could not load reviews.');
    el.querySelector<HTMLButtonElement>('[role=alert] button')?.click();
    expect(reload).toHaveBeenCalled();
  });

  it('shows a skeleton while loading', async () => {
    expect((await open(undefined)).el.querySelectorAll('app-skeleton').length).toBeGreaterThan(0);
  });

  describe('replying', () => {
    const replyButtons = (el: HTMLElement) =>
      Array.from(el.querySelectorAll('button')).filter((b) => b.textContent?.trim() === 'Reply');
    const signIn = () => {
      TestBed.inject(SessionStore).start({
        token: 't',
        user: { id: 'u', name: 'Ann', email: 'a@b.lk', role: 'Customer', language: 'en' },
      });
    };

    it('only one reply box is open at a time', async () => {
      const { el, harness } = await open(list);
      signIn();
      replyButtons(el)[0].click();
      harness.detectChanges();
      expect(el.querySelectorAll('app-reply-composer').length).toBe(1);

      replyButtons(el)[0].click(); // the first card's own button is gone; this is the second card's
      harness.detectChanges();
      expect(el.querySelectorAll('app-reply-composer').length).toBe(1);
      expect(
        el.querySelectorAll('app-review-card')[1].querySelector('app-reply-composer'),
      ).not.toBeNull();
    });

    it('closing the box puts the focus back on that review Reply button', async () => {
      const { el, harness } = await open(list);
      signIn();
      replyButtons(el)[0].click();
      harness.detectChanges();
      Array.from(el.querySelectorAll('app-reply-composer button'))
        .find((b) => b.textContent?.trim() === 'Cancel')
        ?.dispatchEvent(new Event('click'));
      harness.detectChanges();
      await harness.fixture.whenStable();
      harness.detectChanges();
      expect(el.querySelector('app-reply-composer')).toBeNull();
      expect(document.activeElement).toBe(replyButtons(el)[0]);
    });

    it('a Guest tapping Reply opens no box', async () => {
      const { el, harness } = await open(list);
      replyButtons(el)[0].click();
      harness.detectChanges();
      expect(el.querySelector('app-reply-composer')).toBeNull();
    });
  });
});
