import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ErrorHandler,
  provideAppInitializer,
  provideZoneChangeDetection,
  type ApplicationConfig,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { apiInterceptor } from './core/api.interceptor';
import { GlobalErrorHandler } from './core/global-error-handler';
import { restoreUiLanguage } from './core/languages';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([apiInterceptor])),
    { provide: ErrorHandler, useExisting: GlobalErrorHandler },
    provideAppInitializer(restoreUiLanguage),
  ],
};
