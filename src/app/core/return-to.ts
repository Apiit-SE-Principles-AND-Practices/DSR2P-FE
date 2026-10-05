import type { Role } from './session.store';

/** The path if it is a same-origin relative one, else null. Blocks `https://evil.com` and `//evil.com`. */
export const safeReturnTo = (url: string | null): string | null =>
  url && /^\/(?![/\\\s])/.test(url) ? url : null;

/** Where to go after login: admins land in /admin, everyone else where they came from (or home). */
export function postLoginPath(role: Role, returnTo: string | null): string {
  const target = safeReturnTo(returnTo);
  if (role === 'Admin') return target && /^\/admin(?:[/?#]|$)/.test(target) ? target : '/admin';
  return target ?? '/';
}
