/** Unsent text kept in sessionStorage, so a failure, reload or re-login loses nothing. Storage can be blocked, so nothing here ever throws. */

export function readDraft(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Saves the draft, or removes it when `value` is null or empty. */
export function writeDraft(key: string, value: string | null): void {
  try {
    if (value) sessionStorage.setItem(key, value);
    else sessionStorage.removeItem(key);
  } catch {
    // not saved; the form still works
  }
}
