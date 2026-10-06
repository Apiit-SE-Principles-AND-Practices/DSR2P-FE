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
  { fg: '--color-text', bg: '--color-bg', min: 4.5 },
  { fg: '--color-text', bg: '--color-surface', min: 4.5 },
  { fg: '--color-text-muted', bg: '--color-bg', min: 4.5 },
  { fg: '--color-text-muted', bg: '--color-surface', min: 4.5 },
  { fg: '--color-on-primary', bg: '--color-primary', min: 4.5 },
  { fg: '--color-on-primary', bg: '--color-primary-hover', min: 4.5 },
  { fg: '--color-on-primary', bg: '--color-danger', min: 4.5 },
  { fg: '--color-primary', bg: '--color-bg', min: 4.5 },
  { fg: '--color-primary', bg: '--color-surface', min: 4.5 },
  { fg: '--color-success', bg: '--color-surface', min: 4.5 },
  { fg: '--color-danger', bg: '--color-surface', min: 4.5 },
  { fg: '--color-warning-text', bg: '--color-warning-bg', min: 4.5 },
  { fg: '--color-focus', bg: '--color-bg', min: 3 },
  { fg: '--color-focus', bg: '--color-surface', min: 3 },
];

/** Ratio for a pair, read from the live CSS custom properties. */
export const pairRatio = ({ fg, bg }: ContrastPair): number =>
  contrastRatio(tokenValue(fg), tokenValue(bg));
