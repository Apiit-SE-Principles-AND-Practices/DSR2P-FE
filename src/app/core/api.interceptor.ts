import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError, timeout, TimeoutError } from 'rxjs';
import { environment } from '../../environments/environment';

/** The one error shape the rest of the app handles (guide §1.5). */
export interface ApiError {
  status: number;
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
}

export const REQUEST_TIMEOUT_MS = 15_000;

function toApiError(error: unknown): ApiError {
  if (error instanceof HttpErrorResponse && error.status > 0) {
    const body = error.error as Partial<ApiError> | null;
    return {
      status: error.status,
      code: body?.code ?? 'HTTP_ERROR',
      message: body?.message ?? error.message,
      fieldErrors: body?.fieldErrors,
    };
  }
  const timedOut = error instanceof TimeoutError;
  return {
    status: 0,
    code: 'NETWORK_ERROR',
    message: timedOut ? 'The request timed out.' : 'Could not reach the server.',
  };
}

// Session token / cookie handling is added in DSR2P-5 once the mechanism is agreed.
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const url = req.url.startsWith('/') ? environment.apiBaseUrl + req.url : req.url;
  const request = req.clone({
    url,
    setHeaders: { 'Accept-Language': document.documentElement.lang },
  });
  return next(request).pipe(
    timeout(REQUEST_TIMEOUT_MS),
    catchError((error: unknown) => throwError(() => toApiError(error))),
  );
};
