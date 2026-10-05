import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GlobalErrorHandler } from '../core/global-error-handler';
import { AppShellComponent } from './app-shell.component';

/** Minimal MediaQueryList that tests can flip, standing in for resizing across 640px. */
function fakeViewport(initial: boolean) {
  let onChange: (e: MediaQueryListEvent) => void = () => undefined;
  spyOn(window, 'matchMedia').and.returnValue({
    matches: initial,
    addEventListener: (_: string, fn: typeof onChange) => (onChange = fn),
    removeEventListener: () => undefined,
  } as unknown as MediaQueryList);
  return (matches: boolean) => {
    onChange({ matches } as MediaQueryListEvent);
  };
}

function render() {
  TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient()] });
  const fixture = TestBed.createComponent(AppShellComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, el, has: (tag: string) => !!el.querySelector(tag) };
}

describe('AppShellComponent', () => {
  it('shows only BottomTabBar below 640px', () => {
    fakeViewport(false);
    const { has } = render();
    expect(has('app-bottom-tab-bar')).toBeTrue();
    expect(has('app-top-nav')).toBeFalse();
  });

  it('shows only TopNav at 640px and above', () => {
    fakeViewport(true);
    const { has } = render();
    expect(has('app-top-nav')).toBeTrue();
    expect(has('app-bottom-tab-bar')).toBeFalse();
  });

  it('swaps nav when the viewport crosses 640px, without a reload', () => {
    const resize = fakeViewport(false);
    const { fixture, has } = render();
    resize(true);
    fixture.detectChanges();
    expect(has('app-top-nav')).toBeTrue();
    expect(has('app-bottom-tab-bar')).toBeFalse();
  });

  it('shows the error fallback instead of a blank page after a render error', () => {
    fakeViewport(false);
    spyOn(console, 'error');
    const { fixture, has } = render();
    TestBed.inject(GlobalErrorHandler).handleError(new Error('boom'));
    fixture.detectChanges();
    expect(has('app-error-fallback')).toBeTrue();
  });

  it('skip link moves focus to main content', () => {
    fakeViewport(false);
    const { el } = render();
    el.querySelector<HTMLAnchorElement>('.skip-link')?.click();
    expect(document.activeElement).toBe(el.querySelector('main'));
  });
});
