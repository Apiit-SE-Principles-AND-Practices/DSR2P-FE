import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { apiInterceptor } from '../../core/api.interceptor';
import { ReplyComposerComponent } from './reply-composer.component';

const KEY = 'reply-draft:5';

async function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(withInterceptors([apiInterceptor])), provideHttpClientTesting()],
  });
  const backend = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(ReplyComposerComponent);
  fixture.componentRef.setInput('reviewId', 5);
  const sent = jasmine.createSpy('sent');
  const cancelled = jasmine.createSpy('cancelled');
  fixture.componentInstance.sent.subscribe(sent);
  fixture.componentInstance.cancelled.subscribe(cancelled);
  fixture.detectChanges();
  await fixture.whenStable(); // lets the box load its draft and take the focus
  fixture.detectChanges();

  const el = fixture.nativeElement as HTMLElement;
  const box = el.querySelector('textarea');
  if (!box) throw new Error('No textarea');
  const type = (text: string) => {
    box.value = text;
    box.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const button = (label: string) => {
    const found = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(label),
    );
    if (!found) throw new Error(`No "${label}" button`);
    return found;
  };
  const submit = () => {
    el.querySelector('form')?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };
  const request = () => backend.expectOne((r) => r.url.endsWith('/reviews/5/comments'));
  return { el, fixture, box, type, button, submit, request, backend, sent, cancelled };
}

describe('ReplyComposerComponent', () => {
  beforeEach(() => {
    sessionStorage.removeItem(KEY);
  });
  afterEach(() => {
    sessionStorage.removeItem(KEY);
  });

  it('puts the keyboard cursor straight into the box', async () => {
    const { box } = await setup();
    expect(document.activeElement).toBe(box);
  });

  it('BB13 — sends the trimmed text as JSON, then reports it sent and clears the draft', async () => {
    const { type, submit, request, sent, fixture } = await setup();
    type('  Thank you for the review!  ');
    submit();
    const req = request();
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ commentText: 'Thank you for the review!' });
    req.flush(
      { id: 9, commentText: 'Thank you for the review!', status: 'Pending' },
      { status: 201, statusText: 'Created' },
    );
    await fixture.whenStable();
    expect(sent).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it('blocks an empty reply: the button is disabled and nothing is sent', async () => {
    const { type, button, submit, backend } = await setup();
    expect(button('Send reply').disabled).toBeTrue();
    submit();
    type('   \n ');
    expect(button('Send reply').disabled).toBeTrue();
    submit();
    backend.expectNone(() => true);
  });

  it('shows a counter and blocks a reply that is too long', async () => {
    const { el, type, button } = await setup();
    type('a'.repeat(1001));
    expect(el.querySelector('.hint')?.textContent).toBe('1001 / 1000');
    expect(el.querySelector('.field-error')?.textContent).toContain('1000 characters or fewer');
    expect(button('Send reply').disabled).toBeTrue();
  });

  it('does not send twice while a request is in flight', async () => {
    const { type, submit, button, request } = await setup();
    type('Hello');
    submit();
    expect(button('Sending').disabled).toBeTrue();
    submit();
    request(); // exactly one request exists (expectOne would fail on two)
  });

  it('keeps the text and offers Retry when sending fails', async () => {
    const { el, box, type, submit, button, request, fixture } = await setup();
    type('Hello again');
    submit();
    request().flush(
      { error: { code: 'INTERNAL_ERROR', message: 'Server error.' } },
      { status: 500, statusText: 'x' },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el.querySelector('[role=alert]')?.textContent).toContain('We couldn’t send your reply.');
    expect(box.value).toBe('Hello again');
    expect(button('Retry').disabled).toBeFalse();
    submit();
    request().flush({ id: 1 }, { status: 201, statusText: 'Created' });
  });

  describe('draft', () => {
    it('is saved as you type', async () => {
      const { type } = await setup();
      type('Work in progress');
      expect(sessionStorage.getItem(KEY)).toBe('Work in progress');
    });

    it('is restored when the box is opened again, and survives Cancel', async () => {
      sessionStorage.setItem(KEY, 'Saved earlier');
      const { box, button, cancelled } = await setup();
      expect(box.value).toBe('Saved earlier');
      button('Cancel').click();
      expect(cancelled).toHaveBeenCalledTimes(1);
      expect(sessionStorage.getItem(KEY)).toBe('Saved earlier');
    });
  });
});
