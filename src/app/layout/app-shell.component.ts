import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { matchesBreakpoint } from '../core/breakpoint';
import { GlobalErrorHandler } from '../core/global-error-handler';
import { ErrorFallbackComponent } from '../shared/error-fallback.component';
import { ToastContainerComponent } from '../shared/toast-container.component';
import { BottomTabBarComponent } from './bottom-tab-bar.component';
import { TopNavComponent } from './top-nav.component';

/** Owns the single 640px nav decision: exactly one of TopNav / BottomTabBar is ever rendered. */
@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    TopNavComponent,
    BottomTabBarComponent,
    ErrorFallbackComponent,
    ToastContainerComponent,
  ],
  styleUrl: './app-shell.component.css',
  template: `
    <a class="skip-link" href="#main" (click)="skipToContent($event, main)">Skip to content</a>
    @if (isTablet()) {
      <app-top-nav />
    }
    <main #main id="main" tabindex="-1">
      @if (errors.failed()) {
        <app-error-fallback />
      } @else {
        <router-outlet />
      }
    </main>
    @if (!isTablet()) {
      <app-bottom-tab-bar />
    }
    <app-toast-container />
  `,
})
export class AppShellComponent {
  protected readonly isTablet = matchesBreakpoint('tablet');
  protected readonly errors = inject(GlobalErrorHandler);

  // A plain "#main" href would resolve against <base href="/"> and navigate away from the route.
  protected skipToContent(event: Event, main: HTMLElement): void {
    event.preventDefault();
    main.focus();
  }
}
