import {
  activeLanguage,
  LANGUAGES,
  restoreUiLanguage,
  setUiLanguage,
  uiLanguage,
} from './languages';

describe('languages', () => {
  beforeEach(() => {
    localStorage.removeItem('language');
    setUiLanguage('en');
    localStorage.removeItem('language');
  });
  afterEach(() => {
    localStorage.removeItem('language');
    setUiLanguage('en');
    localStorage.removeItem('language');
  });

  it('offers English, Sinhala and Tamil, each named in its own script', () => {
    expect(LANGUAGES.map((l) => l.label)).toEqual(['English', 'සිංහල', 'தமிழ்']);
    expect(LANGUAGES.map((l) => l.code)).toEqual(['en', 'si', 'ta']);
  });

  it('setUiLanguage changes the page language, the signal and the saved choice together', () => {
    setUiLanguage('ta');
    expect(document.documentElement.lang).toBe('ta');
    expect(uiLanguage()).toBe('ta');
    expect(activeLanguage()).toBe('ta');
    expect(localStorage.getItem('language')).toBe('ta');
  });

  it('uiLanguage falls back to English for an unknown page language', () => {
    document.documentElement.lang = 'fr';
    expect(uiLanguage()).toBe('en');
  });

  it('persisted after reload — the saved language is applied again on the next visit', () => {
    setUiLanguage('si');
    document.documentElement.lang = 'en'; // a reload starts from the default page
    restoreUiLanguage();
    expect(document.documentElement.lang).toBe('si');
    expect(activeLanguage()).toBe('si');
  });

  it('keeps the default when nothing, or something invalid, was saved', () => {
    restoreUiLanguage();
    expect(uiLanguage()).toBe('en');
    localStorage.setItem('language', 'klingon');
    restoreUiLanguage();
    expect(uiLanguage()).toBe('en');
  });

  it('never throws when storage is blocked', () => {
    spyOn(Storage.prototype, 'setItem').and.throwError('blocked');
    spyOn(Storage.prototype, 'getItem').and.throwError('blocked');
    expect(() => {
      setUiLanguage('si');
      restoreUiLanguage();
    }).not.toThrow();
    expect(uiLanguage()).toBe('si'); // the choice still applies for this visit
  });
});
