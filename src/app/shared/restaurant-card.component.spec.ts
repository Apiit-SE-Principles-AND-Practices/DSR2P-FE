import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { SearchResult } from '../core/search.service';
import { RestaurantCardComponent } from './restaurant-card.component';

const restaurant: SearchResult = {
  id: 'abc-1',
  name: 'Ceylon Spice House',
  city: 'Colombo',
  address: '12 Galle Road',
  imageUrl: 'https://cdn.example.com/spice.jpg',
  categories: [
    { id: 12, name: 'Sri Lankan' },
    { id: 4, name: 'Rice & Biryani' },
  ],
  averageRating: 4.3,
  priceBand: 'Moderate',
};

function render(overrides: Partial<SearchResult> = {}) {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(RestaurantCardComponent);
  fixture.componentRef.setInput('restaurant', { ...restaurant, ...overrides });
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('RestaurantCardComponent', () => {
  it('BB07 — the card is one link to the restaurant page', () => {
    const el = render();
    const links = el.querySelectorAll('a');
    expect(links.length).toBe(1);
    expect(links[0].getAttribute('href')).toBe('/restaurants/abc-1');
    expect(el.querySelectorAll('button, input, select').length).toBe(0); // nothing nested in the link
  });

  it('shows name, city and categories, with the full name as a tooltip for truncation', () => {
    const el = render();
    expect(el.querySelector('.name')?.getAttribute('title')).toBe('Ceylon Spice House');
    expect(el.querySelector('.meta')?.textContent).toBe('Colombo · Sri Lankan, Rice & Biryani');
  });

  it('always shows the rating numeral next to the stars, plus the price band', () => {
    const el = render();
    expect(el.querySelector('app-rating-display strong')?.textContent).toBe('4.3');
    expect(el.querySelector('app-price-band [role=img]')?.getAttribute('aria-label')).toBe(
      'Price band: moderate',
    );
  });

  it('says "No ratings yet" instead of empty stars when unrated', () => {
    const el = render({ averageRating: null });
    expect(el.querySelector('app-rating-display')?.textContent?.trim()).toBe('No ratings yet');
    expect(el.querySelector('.stars')).toBeNull();
  });

  it('lazy-loads the photo, or shows a placeholder when there is none', () => {
    expect(render().querySelector('img')?.getAttribute('loading')).toBe('lazy');
    TestBed.resetTestingModule();
    const el = render({ imageUrl: null });
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('.photo')).not.toBeNull();
  });
});
