import { inject, Injectable, signal } from '@angular/core';
import { SessionStore } from './session.store';

/** Wraps every login-only action (Like, Reply, Report, Write review): Guests get a prompt instead. */
@Injectable({ providedIn: 'root' })
export class RequireLogin {
  private readonly session = inject(SessionStore);
  /** Message shown in the login prompt, or null while it is closed. */
  readonly prompt = signal<string | null>(null);

  /** Runs `action` for a signed-in user; a Guest sees `message` and no request is made. */
  run(message: string, action: () => void): void {
    if (this.session.isAuthenticated()) action();
    else this.prompt.set(message);
  }

  dismiss(): void {
    this.prompt.set(null);
  }
}
