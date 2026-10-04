import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GlobalErrorHandler } from '../core/global-error-handler';
import { InlineErrorComponent } from './inline-error.component';
import { NotFoundComponent } from './not-found.component';
import { TOAST_DURATION_MS, ToastService } from './toast.service';

describe('ToastService', () => {
  it('shows a toast and removes it after the timeout', fakeAsync(() => {
    const toasts = TestBed.inject(ToastService);
    toasts.show('Saved', 'success');
    expect(toasts.toasts().map((t) => t.message)).toEqual(['Saved']);
    tick(TOAST_DURATION_MS);
    expect(toasts.toasts()).toEqual([]);
  }));

  it('dismisses a toast on demand', fakeAsync(() => {
    const toasts = TestBed.inject(ToastService);
    toasts.show('One');
    toasts.dismiss(toasts.toasts()[0].id);
    expect(toasts.toasts()).toEqual([]);
    tick(TOAST_DURATION_MS);
  }));
});

describe('InlineErrorComponent', () => {
  it('shows the message and emits retry when Retry is clicked', () => {
    const fixture = TestBed.createComponent(InlineErrorComponent);
    fixture.componentRef.setInput('message', 'Could not load');
    let retried = false;
    fixture.componentInstance.retry.subscribe(() => (retried = true));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Could not load');
    el.querySelector('button')?.click();
    expect(retried).toBeTrue();
  });
});

describe('NotFoundComponent', () => {
  it('offers a way back home', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(NotFoundComponent);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('a')?.getAttribute('href')).toBe(
      '/',
    );
  });
});

describe('GlobalErrorHandler', () => {
  it('flags the failure so the shell can show the fallback', () => {
    spyOn(console, 'error');
    const handler = TestBed.inject(GlobalErrorHandler);
    handler.handleError(new Error('boom'));
    expect(handler.failed()).toBeTrue();
  });
});
