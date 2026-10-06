import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RequireLogin } from '../../core/require-login';
import { SessionStore } from '../../core/session.store';
import { ToastService } from '../../shared/toast.service';
import { ReportButtonComponent } from './report-button.component';

/** Lets the dialog open (it does so on a microtask). */
const tick = () => new Promise((done) => setTimeout(done));

async function setup(ownerId?: string, signedIn = true) {
  sessionStorage.clear();
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  });
  if (signedIn) {
    const user = {
      id: 'u-1',
      name: 'Ann',
      email: 'a@b.lk',
      role: 'Customer',
      language: 'en',
    } as const;
    TestBed.inject(SessionStore).start({ token: 't', user });
  }
  const fixture = TestBed.createComponent(ReportButtonComponent);
  fixture.componentRef.setInput('kind', 'reviews');
  fixture.componentRef.setInput('id', 5);
  if (ownerId) fixture.componentRef.setInput('ownerId', ownerId);
  fixture.detectChanges();
  await tick();
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const backend = TestBed.inject(HttpTestingController);
  const open = async () => {
    el.querySelector('button')?.click();
    fixture.detectChanges();
    await tick();
  };
  const confirm = () => {
    el.querySelector<HTMLButtonElement>('dialog button.danger')?.click();
    fixture.detectChanges();
  };
  return { backend, confirm, el, fixture, open };
}

describe('ReportButtonComponent', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('asks a Guest to log in and sends nothing', async () => {
    const { el, open } = await setup(undefined, false);
    await open();
    expect(TestBed.inject(RequireLogin).prompt()).toBe('Log in to report this.');
    expect(el.querySelector('dialog')).toBeNull();
  });

  it('is hidden on the user’s own content', async () => {
    const { el } = await setup('u-1');
    expect(el.querySelector('button')).toBeNull();
  });

  it('confirms, reports, thanks the user, and turns into a disabled “Reported”', async () => {
    const { backend, confirm, el, fixture, open } = await setup('someone-else');
    await open();
    expect(el.querySelector('dialog')?.open).toBeTrue();
    confirm();

    const post = backend.expectOne('/reviews/5/report');
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toBeNull();
    post.flush({});
    fixture.detectChanges();

    const button = el.querySelector('button');
    expect(button?.textContent).toContain('Reported');
    expect(button?.disabled).toBeTrue();
    expect(el.querySelector('dialog')).toBeNull();
    expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
      'Thanks — a moderator will review this.',
    );
  });

  it('remembers a report when the page is shown again', async () => {
    const first = await setup();
    await first.open();
    first.confirm();
    first.backend.expectOne('/reviews/5/report').flush({});

    const again = TestBed.createComponent(ReportButtonComponent);
    again.componentRef.setInput('kind', 'reviews');
    again.componentRef.setInput('id', 5);
    again.detectChanges();
    await tick();
    again.detectChanges();
    expect((again.nativeElement as HTMLElement).querySelector('button')?.disabled).toBeTrue();
  });

  it('treats a 409 as already reported', async () => {
    const { backend, confirm, el, fixture, open } = await setup();
    await open();
    confirm();
    backend.expectOne('/reviews/5/report').flush({}, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    expect(el.querySelector('button')?.disabled).toBeTrue();
  });

  it('keeps the dialog open with a message when the report fails', async () => {
    const { backend, confirm, el, fixture, open } = await setup();
    await open();
    confirm();
    backend.expectOne('/reviews/5/report').flush({}, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(el.querySelector('dialog [role=alert]')?.textContent).toContain('couldn’t send');
    expect(el.querySelector('button')?.disabled).toBeFalse();
  });
});
