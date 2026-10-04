/** Breakpoints in px. CSS custom properties can't be used in media queries, so JS and CSS share these values. */
export const BREAKPOINTS = { tablet: 640, desktop: 1024 } as const satisfies Record<string, number>;

export type Breakpoint = keyof typeof BREAKPOINTS;

/** Current value of a CSS custom property, e.g. `tokenValue('--color-primary')`. */
export const tokenValue = (name: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export const minWidthQuery = (bp: Breakpoint): string =>
  `(min-width: ${String(BREAKPOINTS[bp])}px)`;
