import { uiLanguage } from './languages';

/**
 * A price in rupees for the current UI language, e.g. "LKR 1,200" or "LKR 1,200.50". The space inside
 * is non-breaking, so the price never splits across lines. Always read fresh, never cached.
 */
export function formatLkr(amount: number | string): string {
  const value = Number(amount);
  const decimals = Number.isInteger(value) ? 0 : 2;
  return new Intl.NumberFormat(uiLanguage(), {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: 2,
  }).format(value);
}
