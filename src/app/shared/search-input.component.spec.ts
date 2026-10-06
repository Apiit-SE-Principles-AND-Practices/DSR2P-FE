import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SearchInputComponent, TYPING_DEBOUNCE_MS } from './search-input.component';

function setup(url: string) {
  TestBed.configureTestingModule({
    providers: [provideRouter([{ path: '**', children: [] }])],
  });
  const router = TestBed.inject(Router);
  void router.navigateByUrl(url);
  tick();
  const navigate = spyOn(router, 'navigate').and.callThrough();
  const fixture = TestBed.createComponent(SearchInputComponent);
  fixture.detectChanges();
  TestBed.flushEffects();
  const el = fixture.nativeElement as HTMLElement;
  const box = el.querySelector('input');
  if (!box) throw new Error('No search box');
  const type = (text: string) => {
    box.value = text;
    box.dispatchEvent(new Event('input'));
  };
  const submit = () => {
    el.querySelector('form')?.dispatchEvent(new Event('submit'));
    tick();
  };
  return { box, type, submit, navigate, router };
}

describe('SearchInputComponent', () => {
  it('shows the name from the URL, e.g. a shared link', fakeAsync(() => {
    const { box } = setup('/search?q=rice');
    expect(box.value).toBe('rice');
  }));

  it('Enter searches the name and keeps the city and filters', fakeAsync(() => {
    const { type, submit, router } = setup('/search?city=Kandy&diet=Halal&page=3');
    type('  kottu ');
    submit();
    expect(router.url).toBe('/search?city=Kandy&q=kottu&diet=Halal');
  }));

  it('searches from any other page', fakeAsync(() => {
    const { type, submit, router } = setup('/');
    type('kottu');
    submit();
    expect(router.url).toBe('/search?q=kottu');
  }));

  it('an empty search clears the name', fakeAsync(() => {
    const { type, submit, router } = setup('/search?q=rice');
    type('  ');
    submit();
    expect(router.url).toBe('/search');
  }));

  it('on the results page, typing refines once after a pause, without adding history', fakeAsync(() => {
    const { type, navigate, router } = setup('/search?city=Galle');
    ['s', 'se', 'sea'].forEach((text) => {
      type(text);
      tick(TYPING_DEBOUNCE_MS - 100); // keystrokes arrive faster than the debounce
    });
    expect(navigate).not.toHaveBeenCalled();
    tick(100);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate.calls.mostRecent().args[1]).toEqual(
      jasmine.objectContaining({ replaceUrl: true }),
    );
    expect(router.url).toBe('/search?city=Galle&q=sea');
  }));

  it('typing elsewhere does not navigate until Enter', fakeAsync(() => {
    const { type, navigate } = setup('/');
    type('kottu');
    tick(TYPING_DEBOUNCE_MS);
    expect(navigate).not.toHaveBeenCalled();
  }));
});
