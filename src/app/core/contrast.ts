import { tokenValue } from './tokens';

const channel = (value: number): number => {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

/** WCAG 2.1 relative luminance of a #rgb / #rrggbb colour. */
export function luminance(hex: string): number {
  const digits = hex.replace('#', '');
  const full = digits.replace(/^(.)(.)(.)$/, '$1$1$2$2$3$3');
  const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(full.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1 (none) to 21 (black on white). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export interface ContrastPair {
  fg: string;
  bg: string;
  /** 4.5 for text, 3 for UI components (WCAG 2.1 AA). */
  min: number;
}

/** Every foreground/background token pair the UI uses. Add new pairs here; CI checks them all. */
export const CONTRAST_PAIRS: readonly ContrastPair[] = [
  { fg: '--ds-ink', bg: '--ds-surface-50', min: 4.5 },
  { fg: '--ds-ink', bg: '--ds-surface-100', min: 4.5 },
  { fg: '--ds-ink', bg: '--ds-surface-raised', min: 4.5 },
  { fg: '--ds-ink-muted', bg: '--ds-surface-50', min: 4.5 },
  { fg: '--ds-ink-muted', bg: '--ds-surface-raised', min: 4.5 },
  { fg: '--ds-on-brand', bg: '--ds-brand-500', min: 4.5 },
  { fg: '--ds-on-brand', bg: '--ds-brand-600', min: 4.5 },
  { fg: '--ds-brand-600', bg: '--ds-surface-50', min: 4.5 },
  { fg: '--ds-on-accent', bg: '--ds-accent-500', min: 4.5 },
  { fg: '--ds-on-accent', bg: '--ds-accent-600', min: 4.5 },
  { fg: '--ds-status-pending-ink', bg: '--ds-status-pending-bg', min: 4.5 },
  { fg: '--ds-status-approved-ink', bg: '--ds-status-approved-bg', min: 4.5 },
  { fg: '--ds-status-rejected-ink', bg: '--ds-status-rejected-bg', min: 4.5 },
  { fg: '--ds-danger-500', bg: '--ds-surface-50', min: 4.5 },
  { fg: '--ds-focus-ring-color', bg: '--ds-surface-50', min: 3 },
  { fg: '--ds-focus-ring-color', bg: '--ds-surface-100', min: 3 },
  /* Legacy alias compatibility */
  { fg: '--color-text', bg: '--color-bg', min: 4.5 },
  { fg: '--color-text', bg: '--color-surface', min: 4.5 },
  { fg: '--color-text-muted', bg: '--color-bg', min: 4.5 },
  { fg: '--color-text-muted', bg: '--color-surface', min: 4.5 },
  { fg: '--color-on-primary', bg: '--color-primary', min: 4.5 },
  { fg: '--color-on-primary', bg: '--color-primary-hover', min: 4.5 },
  { fg: '--color-warning-text', bg: '--color-warning-bg', min: 4.5 },
];

/** Ratio for a pair, read from the live CSS custom properties. */
export const pairRatio = ({ fg, bg }: ContrastPair): number =>
  contrastRatio(tokenValue(fg), tokenValue(bg));
