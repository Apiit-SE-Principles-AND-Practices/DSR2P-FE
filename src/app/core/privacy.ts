/**
 * Every piece of personal data the registration form collects, and why it is needed. The privacy page
 * shows this list, and a test keeps it identical to the form, so nothing is collected without a reason.
 */
export const DATA_COLLECTED = [
  { key: 'name', label: 'Name', why: 'Shown as your identity on your account.' },
  { key: 'email', label: 'Email', why: 'Your login, and the only way to tell accounts apart.' },
  {
    key: 'password',
    label: 'Password',
    why: 'Proves it is you. It is stored only in a scrambled (hashed) form.',
  },
  {
    key: 'language',
    label: 'Preferred language',
    why: 'So the site and its messages appear in the language you chose.',
  },
] as const;

/** Keys of `localStorage` and `sessionStorage` are all ours (one origin), so deleting an account clears both. */
export function clearLocalData(): void {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    // storage can be blocked; there is then nothing to clear
  }
}

/** Saves `data` as a pretty-printed JSON file through the browser's download. */
export function downloadJson(filename: string, data: unknown): void {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
