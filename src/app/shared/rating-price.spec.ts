import type { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { PriceBand } from '../core/search-params.service';
import { PriceBandComponent } from './price-band.component';
import { RatingDisplayComponent } from './rating-display.component';

function render(component: Type<unknown>, inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(component);
  Object.entries(inputs).forEach(([name, value]) => {
    fixture.componentRef.setInput(name, value);
  });
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('RatingDisplayComponent', () => {
  it('shows stars with the numeral to one decimal and a spoken label', () => {
    const el = render(RatingDisplayComponent, { rating: 4 });
    expect(el.querySelector('strong')?.textContent).toBe('4.0');
    expect(el.querySelector('.stars')?.textContent).toBe('★★★★☆');
    expect(el.querySelector('.sr-only')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Rated 4.0 out of 5',
    );
  });

  it('includes the review count when known', () => {
    const el = render(RatingDisplayComponent, { rating: 4.3, count: 28 });
    expect(el.textContent?.replace(/\s+/g, ' ')).toContain('4.3 (28)');
    expect(el.querySelector('.sr-only')?.textContent).toContain('from 28 reviews');
  });

  it('says "No ratings yet" and never shows empty stars when unrated', () => {
    const el = render(RatingDisplayComponent, { rating: null });
    expect(el.textContent?.trim()).toBe('No ratings yet');
    expect(el.querySelector('.stars')).toBeNull();
  });
});

describe('PriceBandComponent', () => {
  const cases: [PriceBand, string][] = [
    ['Budget', 'Rs'],
    ['Moderate', 'Rs Rs'],
    ['Premium', 'Rs Rs Rs'],
  ];

  cases.forEach(([band, symbols]) => {
    it(`${band} shows "${symbols}" and is read out as the band name`, () => {
      const label = render(PriceBandComponent, { band }).querySelector('[role=img]');
      expect(label?.textContent).toBe(symbols);
      expect(label?.getAttribute('aria-label')).toBe(`Price band: ${band.toLowerCase()}`);
    });
  });

  it('renders nothing when the price is unknown', () => {
    expect(render(PriceBandComponent, { band: null }).textContent?.trim()).toBe('');
  });
});
