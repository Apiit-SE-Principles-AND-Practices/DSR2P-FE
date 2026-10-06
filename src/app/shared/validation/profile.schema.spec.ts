import { profileSchema } from './profile.schema';

const check = (name: unknown) => profileSchema.safeParse({ name });

describe('profileSchema', () => {
  it('accepts a name and trims it', () => {
    expect(profileSchema.parse({ name: '  Nimal Perera  ' }).name).toBe('Nimal Perera');
  });

  it('accepts names in any script', () => {
    expect(check('නිමල් පෙරේරා').success).toBeTrue();
    expect(check('நிமல் பெரேரா').success).toBeTrue();
  });

  ['', '   ', '\t\n'].forEach((blank) => {
    it(`rejects a blank name ${JSON.stringify(blank)}`, () => {
      expect(check(blank).error?.issues[0].message).toBe('Enter your name.');
    });
  });

  it('allows exactly 100 characters and rejects 101 (the same limit as registration and the API)', () => {
    expect(check('a'.repeat(100)).success).toBeTrue();
    expect(check('a'.repeat(101)).error?.issues[0].message).toBe('Use 100 characters or fewer.');
  });

  it('rejects a missing or non-text name', () => {
    expect(check(undefined).success).toBeFalse();
    expect(check(42).success).toBeFalse();
  });
});
