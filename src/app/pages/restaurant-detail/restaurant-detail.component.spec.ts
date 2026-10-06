import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import type { SearchResult } from '../../core/search.service';
import { SessionStore } from '../../core/session.store';
import { RestaurantDetailComponent } from './restaurant-detail.component';

const restaurant: SearchResult = {
  id: 'r-1',
  name: 'Ceylon Spice House',
  city: 'Colombo',
  address: '12 Galle Road',
  imageUrl: null,
  categories: [{ id: 4, name: 'Rice & Biryani' }],
  averageRating: 4.3,
  priceBand: 'Moderate',
};
const reviews = [
  { foodQualityRating: 5, serviceRating: 4, miscRating: 4 },
  { foodQualityRating: 4, serviceRating: 4, miscRating: 3 },
];

function setup(id = 'r-1') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id })) } },
    ],
  });
  const backend = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(RestaurantDetailComponent);
  const el = fixture.nativeElement as HTMLElement;
  /** Renders and lets both sections issue their requests. */
  const settle = () => {
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
  };
  const restaurantRequest = () =>
    backend.expectOne((req) => req.url.endsWith(`/restaurants/${id}`));
  const reviewsRequest = () =>
    backend.expectOne((req) => req.url.endsWith(`/restaurants/${id}/reviews`));
  const done = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return { el, settle, restaurantRequest, reviewsRequest, done };
}

describe('RestaurantDetailComponent', () => {
  it('shows the restaurant, three rating bars with numerals, and sets the page title', async () => {
    const { el, settle, restaurantRequest, reviewsRequest, done } = setup();
    settle();
    restaurantRequest().flush(restaurant);
    reviewsRequest().flush(reviews);
    await done();

    expect(el.querySelector('h1')?.textContent).toBe('Ceylon Spice House');
    expect(el.textContent).toContain('12 Galle Road, Colombo');
    const bars = Array.from(el.querySelectorAll('app-rating-bar'));
    expect(bars.map((b) => b.querySelector('strong')?.textContent)).toEqual(['4.5', '4.0', '3.5']);
    expect(bars.map((b) => b.querySelector('.label')?.textContent)).toEqual([
      'Food quality',
      'Service',
      'Other',
    ]);
    expect(TestBed.inject(Title).getTitle()).toBe('Ceylon Spice House · Ruchi');
  });

  it('shows the zero-review state instead of empty bars', async () => {
    const { el, settle, restaurantRequest, reviewsRequest, done } = setup();
    settle();
    restaurantRequest().flush({ ...restaurant, averageRating: null });
    reviewsRequest().flush([]);
    await done();

    expect(el.textContent).toContain('No approved reviews yet — be the first to write one.');
    expect(el.querySelectorAll('app-rating-bar').length).toBe(0);
  });

  [404, 400].forEach((status) => {
    it(`shows the Not Found view for an unknown restaurant (${String(status)})`, async () => {
      const { el, settle, restaurantRequest, reviewsRequest, done } = setup('nope');
      settle();
      restaurantRequest().flush(
        { error: { code: 'NOT_FOUND', message: 'Restaurant not found' } },
        { status, statusText: 'x' },
      );
      reviewsRequest().flush([]);
      await done();

      expect(el.querySelector('app-not-found h1')?.textContent).toBe('Page not found');
      expect(el.querySelector('app-restaurant-header')).toBeNull();
    });
  });

  it('shows an error with Retry when the restaurant fails to load', async () => {
    const { el, settle, restaurantRequest, reviewsRequest, done } = setup();
    settle();
    restaurantRequest().flush({}, { status: 500, statusText: 'x' });
    reviewsRequest().flush([]);
    await done();
    expect(el.querySelector('[role=alert]')?.textContent).toContain(
      'Could not load this restaurant.',
    );
  });

  it('loads the rating breakdown without waiting for the restaurant', () => {
    const { settle, reviewsRequest } = setup();
    settle(); // the restaurant request is still pending
    expect(reviewsRequest().request.method).toBe('GET');
  });

  it('shows an error for the ratings alone, leaving the header intact', async () => {
    const { el, settle, restaurantRequest, reviewsRequest, done } = setup();
    settle();
    restaurantRequest().flush(restaurant);
    reviewsRequest().flush({}, { status: 500, statusText: 'x' });
    await done();
    expect(el.querySelector('h1')?.textContent).toBe('Ceylon Spice House');
    expect(el.textContent).toContain('Could not load ratings.');
  });

  describe('Write a review', () => {
    const open = async () => {
      const page = setup();
      page.settle();
      page.restaurantRequest().flush(restaurant);
      page.reviewsRequest().flush(reviews);
      await page.done();
      const button = Array.from(page.el.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Write a review'),
      );
      return { button };
    };

    it('prompts a Guest to log in instead of navigating', async () => {
      const { button } = await open();
      const navigate = spyOn(TestBed.inject(Router), 'navigate');
      button?.click();
      expect(navigate).not.toHaveBeenCalled();
    });

    it('takes a signed-in Customer to the review form', async () => {
      const { button } = await open();
      TestBed.inject(SessionStore).start({
        token: 't',
        user: { id: 'u', name: 'Ann', email: 'a@b.lk', role: 'Customer', language: 'en' },
      });
      const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
      button?.click();
      expect(navigate).toHaveBeenCalledWith(['/restaurants', 'r-1', 'review']);
    });
  });
});
