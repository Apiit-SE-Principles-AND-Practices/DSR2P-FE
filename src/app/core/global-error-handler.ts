import { Injectable, signal, type ErrorHandler } from '@angular/core';

/** Catches render-time exceptions so the shell can show a recoverable fallback, never a white screen. */
@Injectable({ providedIn: 'root' })
export class GlobalErrorHandler implements ErrorHandler {
  readonly failed = signal(false);

  handleError(error: unknown): void {
    console.error(error);
    this.failed.set(true);
  }
}
