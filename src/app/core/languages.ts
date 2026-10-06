import { signal } from '@angular/core';
import type { Language } from './session.store';

/** Each language is named in its own script; `short` fits the header, `english` is for the accessible name. */
export const LANGUAGES: readonly {
  code: Language;
  label: string;
  short: string;
  english: string;
}[] = [
  { code: 'en', label: 'English', short: 'EN', english: 'English' },
  { code: 'si', label: 'සිංහල', short: 'සිං', english: 'Sinhala' },
  { code: 'ta', label: 'தமிழ்', short: 'த', english: 'Tamil' },
];

const STORAGE_KEY = 'language';

/** Current UI language (the `<html lang>` attribute), falling back to English. */
export const uiLanguage = (): Language =>
  LANGUAGES.find(({ code }) => code === document.documentElement.lang)?.code ?? 'en';

/** The same language as a signal, so anything showing it updates the moment it changes. */
export const activeLanguage = signal<Language>(uiLanguage());

/** The one place the language changes: the page, the signal and the next visit all follow. */
export function setUiLanguage(language: Language): void {
  document.documentElement.lang = language; // also what screen readers and Accept-Language use
  activeLanguage.set(language);
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // not remembered; the choice still applies for this visit
  }
}

/** Applies the language chosen on the last visit, so a Guest's choice survives a reload. */
export function restoreUiLanguage(): void {
  try {
    const saved = LANGUAGES.find(({ code }) => code === localStorage.getItem(STORAGE_KEY));
    if (saved) setUiLanguage(saved.code);
  } catch {
    // storage blocked: stay on the default
  }
}
