import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { map, tap, type Observable } from 'rxjs';
import { setUiLanguage } from './languages';

const STORAGE_KEY = 'session';

export type Role = 'Customer' | 'Admin';
export type Language = 'en' | 'si' | 'ta';

/** Mirrors the OpenAPI `PublicUser` and `AuthResult` schemas. */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  language: Language;
}
export interface AuthResult {
  token: string;
  user: PublicUser;
}
export interface LoginInput {
  email: string;
  password: string;
}
export interface RegisterInput extends LoginInput {
  name: string;
  language: Language;
}

function restore(): AuthResult | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null') as AuthResult | null;
    if (typeof saved?.token !== 'string' || typeof saved.user.role !== 'string') return null;
    setUiLanguage(saved.user.language);
    return saved;
  } catch {
    return null;
  }
}

function persist(result: AuthResult | null): void {
  try {
    if (result) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage blocked: the session just lasts until reload
  }
}

/**
 * Who is logged in. The backend issues a bearer JWT (no cookie, no refresh, no `GET /me`), so the
 * session is kept in `sessionStorage`: a reload stays signed in, closing the tab signs out. Never
 * `localStorage`, so it does not outlive the tab. An expired token still ends it via the interceptor's 401.
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly http = inject(HttpClient);
  private readonly session = signal<AuthResult | null>(restore());

  readonly user = computed(() => this.session()?.user ?? null);
  readonly role = computed(() => this.user()?.role ?? null);
  readonly token = computed(() => this.session()?.token ?? null);
  readonly isAuthenticated = computed(() => this.session() !== null);

  login(credentials: LoginInput): Observable<PublicUser> {
    return this.authenticate('/auth/login', credentials);
  }

  register(input: RegisterInput): Observable<PublicUser> {
    return this.authenticate('/auth/register', input);
  }

  /** Begins a session and applies the user's saved language. */
  start(result: AuthResult): void {
    this.session.set(result);
    persist(result);
    setUiLanguage(result.user.language);
  }

  /** Replaces the signed-in user's details (e.g. after a profile change); the token stays. */
  updateUser(user: PublicUser): void {
    this.session.update((current) => current && { ...current, user });
    persist(this.session());
  }

  logout(): void {
    this.session.set(null);
    persist(null);
  }

  private authenticate(path: string, body: LoginInput | RegisterInput): Observable<PublicUser> {
    return this.http.post<AuthResult>(path, body).pipe(
      tap((result) => {
        this.start(result);
      }),
      map(({ user }) => user),
    );
  }
}
