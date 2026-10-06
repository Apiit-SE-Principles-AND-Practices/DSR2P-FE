import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { FilterBarComponent } from './filter-bar.component';

/** Stands in for the viewport: `wide` = 640px and up (inline filters), else the bottom sheet. */
function render(wide: boolean, url = '/search') {
  spyOn(window, 'matchMedia').and.returnValue({
    matches: wide,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  } as unknown as MediaQueryList);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const router = TestBed.inject(Router);
  const fixture = TestBed.createComponent(FilterBarComponent);
  const el = fixture.nativeElement as HTMLElement;
  const ready = async () => {
    await router.navigateByUrl(url);
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges(); // the categories resource issues its request on the second pass
    TestBed.inject(HttpTestingController)
      .expectOne((req) => req.url.endsWith('/categories'))
      .flush([
        { id: 3, name: 'Chinese' },
        { id: 12, name: 'Sri Lankan' },
      ]);
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const select = (key: string) => {
    const found = el.querySelector<HTMLSelectElement>(`#filter-${key}`);
    if (!found) throw new Error(`No ${key} select`);
    return found;
  };
  const choose = async (key: string, value: string) => {
    select(key).value = value;
    select(key).dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const chips = () => Array.from(el.querySelectorAll<HTMLButtonElement>('.chip'));
  const button = (text: string) => {
    const found = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(text),
    );
    if (!found) throw new Error(`No "${text}" button`);
    return found;
  };
  const press = async (target: HTMLElement) => {
    target.click();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return { el, router, fixture, ready, choose, chips, button, press };
}

describe('FilterBarComponent — wide screens (inline, applied at once)', () => {
  it('BB06 — choosing a category filters the results via the URL', async () => {
    const { ready, choose, router } = render(true, '/search?city=Kandy&page=3');
    await ready();
    await choose('categoryId', '12');
    expect(router.url).toBe('/search?city=Kandy&categoryId=12'); // page reset to 1
  });

  it('applies spice and price band the same way', async () => {
    const { ready, choose, router } = render(true);
    await ready();
    await choose('spice', 'Extra_Hot');
    await choose('price', 'Budget');
    expect(router.url).toBe('/search?spice=Extra_Hot&price=Budget');
  });

  it('dietary chips show their state in text and are exclusive toggles', async () => {
    const { ready, chips, press, router } = render(true);
    await ready();
    expect(chips().map((c) => c.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'false']);

    await press(chips()[2]); // Halal
    expect(router.url).toBe('/search?diet=Halal');
    expect(chips()[2].getAttribute('aria-pressed')).toBe('true');
    expect(chips()[2].textContent?.trim()).toBe('✓ Halal'); // not colour alone

    await press(chips()[0]); // Vegetarian replaces Halal: the backend takes one diet
    expect(router.url).toBe('/search?diet=Vegetarian');

    await press(chips()[0]); // pressing the active chip clears it
    expect(router.url).toBe('/search');
  });

  it('Clear all removes every filter but keeps the name search and city', async () => {
    const { ready, button, press, router } = render(
      true,
      '/search?city=Galle&q=sea&categoryId=3&diet=Vegan&spice=Mild&price=Premium&page=2',
    );
    await ready();
    await press(button('Clear all'));
    expect(router.url).toBe('/search?city=Galle&q=sea');
  });

  it('shows the current filters in the controls', async () => {
    const { ready, el } = render(true, '/search?categoryId=12&price=Moderate');
    await ready();
    expect(el.querySelector<HTMLSelectElement>('#filter-categoryId')?.value).toBe('12');
    expect(el.querySelector<HTMLSelectElement>('#filter-price')?.value).toBe('Moderate');
  });
});

describe('FilterBarComponent — narrow screens (bottom sheet)', () => {
  it('shows how many filters are applied on the Filters button', async () => {
    const { ready, button } = render(false, '/search?diet=Halal&price=Budget');
    await ready();
    expect(button('Filters').textContent?.trim()).toBe('Filters (2)');
  });

  it('applies the edits only when Apply is pressed', async () => {
    const { ready, button, press, choose, chips, router, el } = render(false, '/search?city=Kandy');
    await ready();
    await press(button('Filters'));
    expect(el.querySelector('dialog')?.open).toBeTrue();

    await choose('categoryId', '3');
    await press(chips()[1]); // Vegan
    expect(router.url).toBe('/search?city=Kandy'); // nothing applied yet

    await press(button('Apply'));
    expect(router.url).toBe('/search?city=Kandy&categoryId=3&diet=Vegan');
    expect(el.querySelector('dialog')?.open).toBeFalse();
  });

  it('Cancel discards the edits', async () => {
    const { ready, button, press, chips, router } = render(false, '/search');
    await ready();
    await press(button('Filters'));
    await press(chips()[0]);
    await press(button('Cancel'));
    await press(button('Filters')); // reopening starts from what is applied
    expect(chips()[0].getAttribute('aria-pressed')).toBe('false');
    expect(router.url).toBe('/search');
  });

  it('Clear all in the sheet is staged until Apply', async () => {
    const { ready, button, press, router } = render(false, '/search?diet=Halal&spice=Hot&q=sea');
    await ready();
    await press(button('Filters'));
    await press(button('Clear all'));
    expect(router.url).toBe('/search?diet=Halal&spice=Hot&q=sea');
    await press(button('Apply'));
    expect(router.url).toBe('/search?q=sea');
  });
});
