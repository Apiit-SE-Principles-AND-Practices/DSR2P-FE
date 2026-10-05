import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { map, tap, type Observable } from 'rxjs';
import { setUiLanguage } from './languages';

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

/**
 * Who is logged in. The backend issues a bearer JWT (no cookie, no refresh, no `GET /me`), so the
 * token is held in memory only: never in web storage where an XSS could read it. A page reload
 * therefore logs the user out until the backend offers a way to restore the session.
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly http = inject(HttpClient);
  private readonly session = signal<AuthResult | null>(null);

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
    setUiLanguage(result.user.language);
  }

  logout(): void {
    this.session.set(null);
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
