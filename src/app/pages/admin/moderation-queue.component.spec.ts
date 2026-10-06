import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ToastService } from '../../shared/toast.service';
import { ModerationQueueComponent } from './moderation-queue.component';

/** Lets a resource start its request (open requests keep `whenStable` waiting). */
const tick = () => new Promise((done) => setTimeout(done));

const review = (id: number, createdAt: string) => ({
  id,
  restaurantId: 'r-1',
  foodQualityRating: 4,
  serviceRating: 3,
  miscRating: 5,
  reviewText: `Review ${String(id)}`,
  language: 'en',
  status: 'Pending',
  createdAt,
  comments: [],
  response: null,
  images: [],
});
const QUEUE = {
  reviews: [review(1, '2026-10-01T10:00:00Z'), review(2, '2026-10-02T10:00:00Z')],
  comments: [
    {
      id: 7,
      reviewId: 1,
      commentText: 'Reply 7',
      status: 'Pending',
      createdAt: '2026-10-03T10:00:00Z',
    },
  ],
};

async function setup(url = '/admin/moderation') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'admin/moderation', component: ModerationQueueComponent }]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const backend = TestBed.inject(HttpTestingController);
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  const el = harness.fixture.nativeElement as HTMLElement;
  await tick();
  backend.expectOne('/admin/moderation/queue').flush(QUEUE);
  backend
    .match((r) => r.url === '/restaurants')
    .forEach((r) => {
      r.flush({ data: [{ id: 'r-1', name: 'Sea Spray' }] });
    });
  await tick();
  harness.detectChanges();
  return { backend, harness, el };
}

const heading = (el: HTMLElement) => el.querySelector('h1')?.textContent;
const items = (el: HTMLElement) => el.querySelectorAll('app-moderation-item');
const buttonIn = (item: Element, text: string) =>
  [...item.querySelectorAll('button')].find((b) => b.textContent?.includes(text));
const errorBody = (message: string) => ({ error: { code: 'X', message, details: {} } });

describe('ModerationQueueComponent', () => {
  it('lists reviews and replies oldest first with the count in the heading', async () => {
    const { el } = await setup();
    expect(heading(el)).toBe('Moderation queue (3)');
    expect([...items(el)].map((i) => i.querySelector('.text')?.textContent)).toEqual([
      'Review 1',
      'Review 2',
      'Reply 7',
    ]);
    expect(items(el)[0].textContent).toContain('Sea Spray');
    expect(items(el)[2].querySelector('.parent')?.textContent).toBe('Review 1');
  });

  it('filters by the type in the address', async () => {
    const { el } = await setup('/admin/moderation?type=comments');
    expect(heading(el)).toBe('Moderation queue (1)');
    expect(items(el)[0].textContent).toContain('Reply 7');
  });

  it('BB14: an approved item stays, busy, until the server answers; then it goes and the count drops', async () => {
    const { backend, harness, el } = await setup();
    buttonIn(items(el)[0], 'Approve')?.click();
    harness.detectChanges();

    const patch = backend.expectOne('/admin/reviews/1/approve');
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toBeNull(); // approving needs no body
    expect(items(el).length).toBe(3); // not removed optimistically
    expect(buttonIn(items(el)[0], 'Approv')?.disabled).toBeTrue();
    expect(items(el)[0].textContent).toContain('Approving…');

    patch.flush({});
    harness.detectChanges();
    expect(items(el).length).toBe(2);
    expect(heading(el)).toBe('Moderation queue (2)');
  });

  it('BB15: rejecting needs a reason, sends it, and removes the item only after success', async () => {
    const { backend, harness, el } = await setup();
    buttonIn(items(el)[0], 'Reject')?.click();
    harness.detectChanges();
    await Promise.resolve();
    const confirm = el.querySelector<HTMLButtonElement>('dialog button.danger');
    expect(confirm?.disabled).toBeTrue();

    const box = el.querySelector('textarea');
    if (!box) throw new Error('No textarea');
    box.value = 'Spam';
    box.dispatchEvent(new Event('input'));
    harness.detectChanges();
    confirm?.click();

    const patch = backend.expectOne('/admin/reviews/1/reject');
    expect(patch.request.body).toEqual({ reason: 'Spam' });
    expect(items(el).length).toBe(3);
    patch.flush({});
    harness.detectChanges();
    expect(items(el).length).toBe(2);
  });

  it('keeps the item, with a message, when the decision fails', async () => {
    const { backend, harness, el } = await setup();
    buttonIn(items(el)[0], 'Approve')?.click();
    backend
      .expectOne('/admin/reviews/1/approve')
      .flush(errorBody('Boom'), { status: 500, statusText: 'Server Error' });
    harness.detectChanges();

    expect(items(el).length).toBe(3);
    expect(items(el)[0].querySelector('[role=alert]')?.textContent).toContain('still in the queue');
    expect(buttonIn(items(el)[0], 'Approve')?.disabled).toBeFalse();
  });

  it('on 409 tells the admin and removes the item', async () => {
    const { backend, harness, el } = await setup();
    buttonIn(items(el)[0], 'Approve')?.click();
    backend
      .expectOne('/admin/reviews/1/approve')
      .flush(errorBody('Already moderated'), { status: 409, statusText: 'Conflict' });
    harness.detectChanges();

    expect(items(el).length).toBe(2);
    expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
      'Already moderated by another admin.',
    );
  });

  it('moves focus to the next item after a removal', async () => {
    const { backend, harness, el } = await setup();
    buttonIn(items(el)[0], 'Approve')?.click();
    backend.expectOne('/admin/reviews/1/approve').flush({});
    harness.detectChanges();
    await tick();

    expect(document.activeElement?.id).toBe('mod-reviews-2');
  });

  it('refetches when the window regains focus', async () => {
    const { backend, harness } = await setup();
    window.dispatchEvent(new Event('focus'));
    harness.detectChanges();
    await tick();
    backend.expectOne('/admin/moderation/queue');
  });

  describe('replies (DSR2P-34)', () => {
    it('BB14: approving a reply PATCHes the comments endpoint and removes it only after success', async () => {
      const { backend, harness, el } = await setup('/admin/moderation?type=comments');
      buttonIn(items(el)[0], 'Approve')?.click();
      harness.detectChanges();

      const patch = backend.expectOne('/admin/comments/7/approve');
      expect(patch.request.method).toBe('PATCH');
      expect(patch.request.body).toBeNull();
      expect(items(el).length).toBe(1);
      patch.flush({});
      harness.detectChanges();
      expect(items(el).length).toBe(0);
      expect(el.textContent).toContain('Nothing is waiting for moderation.');
    });

    it('BB15: rejecting a reply needs a reason, then sends it', async () => {
      const { backend, harness, el } = await setup('/admin/moderation?type=comments');
      buttonIn(items(el)[0], 'Reject')?.click();
      harness.detectChanges();
      await Promise.resolve();
      expect(el.querySelector('dialog')?.textContent).toContain('Reject this reply');
      const confirm = el.querySelector<HTMLButtonElement>('dialog button.danger');
      expect(confirm?.disabled).toBeTrue();

      const box = el.querySelector('textarea');
      if (!box) throw new Error('No textarea');
      box.value = 'Spam';
      box.dispatchEvent(new Event('input'));
      harness.detectChanges();
      confirm?.click();

      const patch = backend.expectOne('/admin/comments/7/reject');
      expect(patch.request.body).toEqual({ reason: 'Spam' });
      patch.flush({});
      harness.detectChanges();
      expect(items(el).length).toBe(0);
    });

    it('keeps a reply when its decision fails', async () => {
      const { backend, harness, el } = await setup('/admin/moderation?type=comments');
      buttonIn(items(el)[0], 'Approve')?.click();
      backend
        .expectOne('/admin/comments/7/approve')
        .flush(errorBody('Boom'), { status: 500, statusText: 'Server Error' });
      harness.detectChanges();

      expect(items(el).length).toBe(1);
      expect(items(el)[0].querySelector('[role=alert]')).not.toBeNull();
    });
  });
});
