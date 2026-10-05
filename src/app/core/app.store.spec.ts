import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AppStore } from './app.store';

async function setup(url = '/') {
  TestBed.configureTestingModule({ providers: [provideRouter([{ path: '**', children: [] }])] });
  const router = TestBed.inject(Router);
  await router.navigateByUrl(url);
  return { store: TestBed.inject(AppStore), router };
}

describe('AppStore (city)', () => {
  beforeEach(() => {
    localStorage.removeItem('city');
  });
  afterEach(() => {
    localStorage.removeItem('city');
  });

  it('defaults to Colombo', async () => {
    expect((await setup()).store.city()).toBe('Colombo');
  });

  it('remembers the choice across visits', async () => {
    (await setup()).store.select('Galle');
    expect(localStorage.getItem('city')).toBe('Galle');

    TestBed.resetTestingModule();
    expect((await setup()).store.city()).toBe('Galle');
  });

  it('ignores a corrupt remembered value', async () => {
    localStorage.setItem('city', 'Paris');
    expect((await setup()).store.city()).toBe('Colombo');
  });

  it('selecting a city off the results page only updates the store', async () => {
    const { store, router } = await setup('/');
    store.select('Kandy');
    expect(store.city()).toBe('Kandy');
    expect(router.url).toBe('/');
  });

  it('selecting a city on the results page updates the URL once and resets the page', async () => {
    const { store, router } = await setup('/search?city=Colombo&diet=Halal&page=3');
    const navigate = spyOn(router, 'navigate').and.callThrough();
    store.select('Kandy');
    await navigate.calls.mostRecent().returnValue;
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(router.url).toBe('/search?city=Kandy&diet=Halal');
  });

  it('adopts the city of a shared link', async () => {
    const { store } = await setup('/search?city=Galle');
    TestBed.flushEffects();
    expect(store.city()).toBe('Galle');
    expect(localStorage.getItem('city')).toBe('Galle');
  });
});
