import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppStore } from '../core/app.store';
import { CategoryGridComponent } from './category-grid.component';

function setup() {
  localStorage.removeItem('city');
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  });
  const backend = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(CategoryGridComponent);
  const el = fixture.nativeElement as HTMLElement;
  /** Renders and lets the resource issue its request (whenStable would wait on the pending mock request). */
  const settle = () => {
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
  };
  const answer = async (body: object, status = 200) => {
    backend.expectOne(() => true).flush(body, { status, statusText: 'x' });
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const respond = async (body: object, status = 200) => {
    settle();
    await answer(body, status);
  };
  return { el, settle, answer, respond };
}

describe('CategoryGridComponent', () => {
  afterEach(() => {
    localStorage.removeItem('city');
  });

  it('shows skeleton tiles while loading', () => {
    const { el, settle } = setup();
    settle();
    expect(el.querySelectorAll('app-skeleton').length).toBe(6);
  });

  it('renders a tile per category, linking to the results filtered by it for the current city', async () => {
    const { el, respond } = setup();
    await respond([
      { id: 4, name: 'Rice & Biryani' },
      { id: 3, name: 'Chinese' },
    ]);
    const tiles = Array.from(el.querySelectorAll('a.tile'));
    expect(tiles.map((a) => a.textContent)).toEqual(['Rice & Biryani', 'Chinese']);
    expect(tiles[0].getAttribute('href')).toBe('/search?city=Colombo&categoryId=4');
  });

  it('carries the selected city into the links', async () => {
    const { el, respond } = setup();
    TestBed.inject(AppStore).select('Galle');
    await respond([{ id: 10, name: 'Seafood' }]);
    expect(el.querySelector('a.tile')?.getAttribute('href')).toBe(
      '/search?city=Galle&categoryId=10',
    );
  });

  it('says so when there are no categories', async () => {
    const { el, respond } = setup();
    await respond([]);
    expect(el.textContent).toContain('No categories yet.');
  });

  it('shows an error with Retry that fetches again', async () => {
    const { el, respond, settle, answer } = setup();
    await respond({}, 500);
    expect(el.querySelector('[role=alert]')?.textContent).toContain('Could not load categories.');

    el.querySelector<HTMLButtonElement>('[role=alert] button')?.click();
    settle();
    await answer([{ id: 3, name: 'Chinese' }]);
    expect(el.querySelectorAll('a.tile').length).toBe(1);
  });
});
