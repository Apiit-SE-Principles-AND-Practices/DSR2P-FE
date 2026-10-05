import type { Language } from './session.store';

/** Each language is named in its own script. */
export const LANGUAGES: readonly { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'si', label: 'සිංහල' },
  { code: 'ta', label: 'தமிழ்' },
];

/** Current UI language, falling back to English. Becomes a proper store with the switcher (DSR2P-26). */
export const uiLanguage = (): Language =>
  LANGUAGES.find(({ code }) => code === document.documentElement.lang)?.code ?? 'en';

export const setUiLanguage = (language: Language): void => {
  document.documentElement.lang = language;
};
