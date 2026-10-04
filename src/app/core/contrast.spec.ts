import { CONTRAST_PAIRS, contrastRatio, pairRatio } from './contrast';

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for identical colours', () => {
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#777777', '#777777')).toBe(1);
  });

  it('matches known WCAG values (order independent)', () => {
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 1); // smallest grey passing AA
    expect(contrastRatio('#ffffff', '#767676')).toBeCloseTo(4.54, 1);
    expect(contrastRatio('#777777', '#ffffff')).toBeLessThan(4.5); // just fails AA
  });
});

// This is the CI gate: it fails the build if any theme pair drops below its WCAG AA minimum.
describe('theme contrast (WCAG 2.1 AA)', () => {
  CONTRAST_PAIRS.forEach((pair) => {
    it(`${pair.fg} on ${pair.bg} is at least ${String(pair.min)}:1`, () => {
      expect(pairRatio(pair)).toBeGreaterThanOrEqual(pair.min);
    });
  });
});
