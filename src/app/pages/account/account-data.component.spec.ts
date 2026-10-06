import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SessionStore, type Role } from '../../core/session.store';
import { ToastService } from '../../shared/toast.service';
import { AccountDataComponent } from './account-data.component';

/** Lets a resource start its request (open requests keep `whenStable` waiting). */
const tick = () => new Promise((done) => setTimeout(done));

async function setup(role: Role = 'Customer') {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  });
  const session = TestBed.inject(SessionStore);
  session.start({
    token: 't',
    user: { id: 'u-1', name: 'Ann', email: 'ann@b.lk', role, language: 'en' },
  });
  const backend = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(AccountDataComponent);
  fixture.detectChanges();
  await tick();
  const el = fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.includes(text));
  return { backend, button, el, fixture, session };
}

/** Answers the two list requests that count what goes with the account. */
function answerCounts({ backend }: Awaited<ReturnType<typeof setup>>) {
  backend.expectOne('/users/me/reviews').flush([{}, {}, {}]);
  backend.expectOne('/users/me/comments').flush([{}]);
}

describe('AccountDataComponent', () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('downloads the profile, reviews and replies as one JSON file', async () => {
    const s = await setup();
    answerCounts(s);
    let saved: Blob | undefined;
    spyOn(URL, 'createObjectURL').and.callFake((blob) => {
      saved = blob as Blob;
      return 'blob:x';
    });
    spyOn(URL, 'revokeObjectURL');
    const click = spyOn(HTMLAnchorElement.prototype, 'click');

    s.button('Download my data')?.click();
    s.backend.expectOne('/users/me/reviews').flush([{ id: 1, reviewText: 'Nice' }]);
    s.backend.expectOne('/users/me/comments').flush([{ id: 2, commentText: 'Thanks' }]);

    expect(click).toHaveBeenCalled();
    const data = JSON.parse((await saved?.text()) ?? '{}') as Record<string, unknown>;
    expect(data['profile']).toEqual(jasmine.objectContaining({ name: 'Ann', email: 'ann@b.lk' }));
    expect(data['reviews']).toEqual([{ id: 1, reviewText: 'Nice' }]);
    expect(data['comments']).toEqual([{ id: 2, commentText: 'Thanks' }]);
  });

  it('shows a message and lets the user try again when the export fails', async () => {
    const s = await setup();
    answerCounts(s);
    s.button('Download my data')?.click();
    s.backend.expectOne('/users/me/reviews').flush({}, { status: 500, statusText: 'Error' });
    s.fixture.detectChanges(); // the other request is cancelled with it

    expect(s.el.textContent).toContain('We couldn’t prepare your data.');
    expect(s.button('Download my data')?.disabled).toBeFalse();
  });

  it('needs the typed word DELETE, and lists what goes with the account', async () => {
    const s = await setup();
    answerCounts(s);
    await tick();
    s.button('Delete my account')?.click();
    s.fixture.detectChanges();
    await tick();

    const dialog = s.el.querySelector('dialog');
    expect(dialog?.textContent).toContain('3 reviews');
    expect(dialog?.textContent).toContain('1 replies');
    const confirm = dialog?.querySelector<HTMLButtonElement>('button.danger');
    expect(confirm?.disabled).toBeTrue();

    const box = dialog?.querySelector('input');
    if (!box) throw new Error('No input');
    box.value = 'DELETE';
    box.dispatchEvent(new Event('input'));
    s.fixture.detectChanges();
    expect(confirm?.disabled).toBeFalse();
  });

  it('on success signs out, clears everything kept in the browser and goes home', async () => {
    const s = await setup();
    answerCounts(s);
    await tick();
    localStorage.setItem('city', 'Kandy');
    sessionStorage.setItem('review-draft:1', '{}');
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    s.button('Delete my account')?.click();
    s.fixture.detectChanges();
    await tick();
    const box = s.el.querySelector('dialog input');
    if (!box) throw new Error('No input');
    (box as HTMLInputElement).value = 'DELETE';
    box.dispatchEvent(new Event('input'));
    s.fixture.detectChanges();
    s.el.querySelector<HTMLButtonElement>('dialog button.danger')?.click();

    const del = s.backend.expectOne('/users/me');
    expect(del.request.method).toBe('DELETE');
    del.flush(null, { status: 204, statusText: 'No Content' });

    expect(s.session.isAuthenticated()).toBeFalse();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(navigate).toHaveBeenCalledWith(['/']);
    expect(TestBed.inject(ToastService).toasts()[0].message).toBe('Your account has been deleted.');
  });

  it('keeps the account and says so when the delete fails', async () => {
    const s = await setup();
    answerCounts(s);
    await tick();
    s.button('Delete my account')?.click();
    s.fixture.detectChanges();
    await tick();
    const box = s.el.querySelector<HTMLInputElement>('dialog input');
    if (!box) throw new Error('No input');
    box.value = 'DELETE';
    box.dispatchEvent(new Event('input'));
    s.fixture.detectChanges();
    s.el.querySelector<HTMLButtonElement>('dialog button.danger')?.click();
    s.backend.expectOne('/users/me').flush({}, { status: 500, statusText: 'Error' });

    expect(s.session.isAuthenticated()).toBeTrue();
    expect(TestBed.inject(ToastService).toasts()[0].message).toContain('Could not delete');
  });

  it('does not offer deletion to an Admin', async () => {
    const s = await setup('Admin');
    expect(s.button('Delete my account')).toBeUndefined();
    expect(s.el.textContent).toContain('Administrator accounts can’t be deleted here');
    s.backend.expectNone('/users/me/reviews');
  });
});
