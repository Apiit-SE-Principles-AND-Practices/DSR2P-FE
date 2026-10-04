import { BREAKPOINTS, minWidthQuery } from './tokens';

describe('tokens', () => {
  it('defines the documented breakpoints', () => {
    expect(BREAKPOINTS).toEqual({ tablet: 640, desktop: 1024 });
  });

  it('builds a min-width media query', () => {
    expect(minWidthQuery('tablet')).toBe('(min-width: 640px)');
  });

  it('exposes CSS custom properties globally', () => {
    const style = getComputedStyle(document.documentElement);
    expect(style.getPropertyValue('--space-4').trim()).toBe('1rem');
    expect(style.getPropertyValue('--color-primary').trim()).toBe('#a63a14');
  });
});
