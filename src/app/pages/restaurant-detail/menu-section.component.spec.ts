import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { MenuItem } from '../../core/menu';
import { MenuSectionComponent } from './menu-section.component';

const NBSP = ' '; // Intl keeps the currency and the number together

const item = (id: number, name: string, priceLkr: string, categoryId: number): MenuItem => ({
  id,
  name,
  priceLkr,
  isVegetarian: false,
  isVegan: false,
  isHalal: false,
  spiceLevel: 'None',
  imageUrl: null,
  categoryId,
});
const categories = [
  { id: 2, name: 'Desserts' },
  { id: 5, name: 'Rice' },
];

function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const backend = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(MenuSectionComponent);
  fixture.componentRef.setInput('restaurantId', 'r-1');
  const el = fixture.nativeElement as HTMLElement;
  const settle = () => {
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
  };
  /** Answers the menu and category requests the section makes. */
  const answer = async (menu: MenuItem[], status = 200) => {
    backend
      .expectOne((req) => req.url.endsWith('/restaurants/r-1/menu'))
      .flush(status === 200 ? menu : {}, { status, statusText: 'x' });
    backend
      .match((req) => req.url.endsWith('/categories'))
      .forEach((req) => {
        req.flush(categories);
      });
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return { el, backend, settle, answer };
}

describe('MenuSectionComponent', () => {
  it('BB08 — shows dishes grouped under category headings', async () => {
    const { el, settle, answer } = setup();
    settle();
    await answer([
      item(1, 'Biryani', '1200', 5),
      item(2, 'Watalappan', '450', 2),
      item(3, 'Fried rice', '900', 5),
    ]);

    expect(Array.from(el.querySelectorAll('h3')).map((h) => h.textContent)).toEqual([
      'Desserts',
      'Rice',
    ]);
    const rows = Array.from(el.querySelectorAll('app-menu-item-row')).map((r) => [
      r.querySelector('.name')?.textContent,
      r.querySelector('.price')?.textContent,
    ]);
    expect(rows).toEqual([
      ['Watalappan', `LKR${NBSP}450`],
      ['Biryani', `LKR${NBSP}1,200`],
      ['Fried rice', `LKR${NBSP}900`],
    ]);
  });

  it('asks for a fresh menu every time, never a cached one', () => {
    const { backend, settle } = setup();
    settle();
    const request = backend.expectOne((req) => req.url.endsWith('/restaurants/r-1/menu'));
    expect(request.request.headers.get('Cache-Control')).toBe('no-cache');
  });

  it('fetches the menu again when the window regains focus, keeping the dishes on screen', async () => {
    const { el, settle, answer, backend } = setup();
    settle();
    await answer([item(1, 'Biryani', '1200', 5)]);

    window.dispatchEvent(new Event('focus'));
    settle();
    expect(el.textContent).toContain(`LKR${NBSP}1,200`); // still shown while refreshing
    await answer([item(1, 'Biryani', '1500', 5)]); // an Admin changed the price
    expect(el.textContent).toContain(`LKR${NBSP}1,500`);
    backend.verify();
  });

  it('says so when the menu is empty', async () => {
    const { el, settle, answer } = setup();
    settle();
    await answer([]);
    expect(el.textContent).toContain('Menu not available yet.');
    expect(el.querySelectorAll('h3').length).toBe(0);
  });

  it('shows a skeleton while loading', () => {
    const { el, settle } = setup();
    settle();
    expect(el.querySelectorAll('app-skeleton').length).toBe(1);
  });

  it('shows an error with Retry that fetches again', async () => {
    const { el, settle, answer } = setup();
    settle();
    await answer([], 500);
    expect(el.querySelector('[role=alert]')?.textContent).toContain('Could not load the menu.');

    el.querySelector<HTMLButtonElement>('[role=alert] button')?.click();
    settle();
    await answer([item(1, 'Biryani', '900', 5)]);
    expect(el.querySelectorAll('app-menu-item-row').length).toBe(1);
  });
});
