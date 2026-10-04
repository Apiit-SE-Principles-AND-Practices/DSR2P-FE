import { DestroyRef, inject, signal, type Signal } from '@angular/core';
import { minWidthQuery, type Breakpoint } from './tokens';

/** Reactive "viewport is at least this wide". Call from an injection context. */
export function matchesBreakpoint(bp: Breakpoint): Signal<boolean> {
  const mql = window.matchMedia(minWidthQuery(bp));
  const matches = signal(mql.matches);
  const onChange = (e: MediaQueryListEvent) => {
    matches.set(e.matches);
  };
  mql.addEventListener('change', onChange);
  inject(DestroyRef).onDestroy(() => {
    mql.removeEventListener('change', onChange);
  });
  return matches.asReadonly();
}
