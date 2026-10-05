import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, timeout, TimeoutError } from 'rxjs';
import { environment } from '../../environments/environment';
import { SessionStore } from './session.store';

/** The one error shape the rest of the app handles (guide §1.5). */
export interface ApiError {
  status: number;
  code: string;
  message: string;
  /** First server message per form field. */
  fieldErrors?: Record<string, string>;
}

/** What the backend sends on errors (OpenAPI `Error` / `ValidationError`). */
interface ErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    details?: { fieldErrors?: Record<string, string[]> };
  };
}

export const REQUEST_TIMEOUT_MS = 15_000;

function toApiError(error: unknown): ApiError {
  if (error instanceof HttpErrorResponse && error.status > 0) {
    const { code, message, details } = (error.error as ErrorEnvelope | null)?.error ?? {};
    const fieldErrors =
      details?.fieldErrors &&
      Object.fromEntries(
        Object.entries(details.fieldErrors).map(([field, [first]]) => [field, first]),
      );
    return {
      status: error.status,
      code: code ?? 'HTTP_ERROR',
      message: message ?? error.message,
      fieldErrors,
    };
  }
  const timedOut = error instanceof TimeoutError;
  return {
    status: 0,
    code: 'NETWORK_ERROR',
    message: timedOut ? 'The request timed out.' : 'Could not reach the server.',
  };
}

/** Only our own API gets the base URL, language and token; absolute URLs pass through untouched. */
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/')) return next(req);

  const token = inject(SessionStore).token();
  const request = req.clone({
    url: environment.apiBaseUrl + req.url,
    setHeaders: {
      'Accept-Language': document.documentElement.lang,
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  return next(request).pipe(
    timeout(REQUEST_TIMEOUT_MS),
    catchError((error: unknown) => throwError(() => toApiError(error))),
  );
};
