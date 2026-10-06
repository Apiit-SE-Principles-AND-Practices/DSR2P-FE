import { formatLkr } from './format';

const NBSP = ' '; // Intl keeps the currency and the number together

describe('formatLkr', () => {
  afterEach(() => {
    document.documentElement.lang = 'en';
  });

  it('formats rupees with a thousands separator and no needless decimals', () => {
    expect(formatLkr(1200)).toBe(`LKR${NBSP}1,200`);
  });

  it('shows two decimals only when there are cents', () => {
    expect(formatLkr(1200.5)).toBe(`LKR${NBSP}1,200.50`);
  });

  it('accepts the string the API actually sends', () => {
    expect(formatLkr('900')).toBe(`LKR${NBSP}900`);
  });

  it('follows the UI language', () => {
    document.documentElement.lang = 'si';
    expect(formatLkr(1200)).toBe(
      new Intl.NumberFormat('si', {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 0,
      }).format(1200),
    );
  });
});
