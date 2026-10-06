import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { apiInterceptor } from '../../core/api.interceptor';
import { ReviewFormComponent } from './review-form.component';

const KEY = 'review-draft:r-1';
const dishes = [
  { id: 7, name: 'Chicken Kottu' },
  { id: 9, name: 'Watalappan' },
];

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(withInterceptors([apiInterceptor])),
      provideHttpClientTesting(),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ id: 'r-1' }) } },
      },
    ],
  });
  const backend = TestBed.inject(HttpTestingController);
  const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  const fixture = TestBed.createComponent(ReviewFormComponent);
  const el = fixture.nativeElement as HTMLElement;

  /** Renders, lets the page load its restaurant and menu, and answers both. */
  const open = async () => {
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    backend
      .expectOne((r) => r.url.endsWith('/restaurants/r-1'))
      .flush({ id: 'r-1', name: 'Ceylon Spice House' });
    backend.expectOne((r) => r.url.endsWith('/restaurants/r-1/menu')).flush(dishes);
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const star = (group: string, n: number) => {
    el.querySelector<HTMLInputElement>(`input[name=${group}][value="${String(n)}"]`)?.click();
    fixture.detectChanges();
  };
  const rateAll = (food = 5, service = 4, misc = 3) => {
    star('food', food);
    star('service', service);
    star('misc', misc);
  };
  const write = (text: string) => {
    const box = el.querySelector('textarea');
    if (!box) throw new Error('No textarea');
    box.value = text;
    box.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  /** Picks a real picture through the photo picker and waits for it to be processed. */
  const addPhoto = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    canvas.getContext('2d')?.fillRect(0, 0, 640, 480);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png');
    });
    const transfer = new DataTransfer();
    transfer.items.add(new File([blob ?? new Blob()], 'me.png', { type: 'image/png' }));
    const input = el.querySelector<HTMLInputElement>('input[type=file]');
    if (!input) throw new Error('No file input');
    input.files = transfer.files;
    input.dispatchEvent(new Event('change'));
    await new Promise((resolve) => setTimeout(resolve, 150)); // decoding is not tracked by Angular
    fixture.detectChanges();
  };
  const confirmRights = () => {
    el.querySelector<HTMLInputElement>('input[type=checkbox]')?.click();
    fixture.detectChanges();
  };
  const submitButton = () => el.querySelector<HTMLButtonElement>('button[type=submit]');
  const submit = () => {
    el.querySelector('form')?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };
  const reviewRequest = () => backend.expectOne((r) => r.url.endsWith('/reviews'));
  return {
    el,
    fixture,
    open,
    star,
    rateAll,
    write,
    addPhoto,
    confirmRights,
    submitButton,
    submit,
    reviewRequest,
    navigate,
  };
}

describe('ReviewFormComponent', () => {
  beforeEach(() => {
    sessionStorage.removeItem(KEY);
  });
  afterEach(() => {
    sessionStorage.removeItem(KEY);
  });

  it('shows the restaurant name and starts with Submit disabled', async () => {
    const { el, open, submitButton } = setup();
    await open();
    expect(el.textContent).toContain('Ceylon Spice House');
    expect(submitButton()?.disabled).toBeTrue();
  });

  it('keeps Submit disabled until all three ratings and some text are filled', async () => {
    const { open, star, write, submitButton } = setup();
    await open();
    star('food', 5);
    star('service', 4);
    write('Lovely');
    expect(submitButton()?.disabled).toBeTrue(); // "Other" still missing
    star('misc', 3);
    expect(submitButton()?.disabled).toBeFalse();
    write('   ');
    expect(submitButton()?.disabled).toBeTrue(); // blank text does not count
  });

  it('BB10 — submits as multipart, then goes to the restaurant with a pending notice and clears the draft', async () => {
    const { open, rateAll, write, submit, reviewRequest, navigate, fixture } = setup();
    await open();
    rateAll(5, 4, 3);
    write('  Great flavours.  ');
    submit();

    const req = reviewRequest();
    const form = req.request.body as FormData;
    expect(form.get('restaurantId')).toBe('r-1');
    expect([
      form.get('foodQualityRating'),
      form.get('serviceRating'),
      form.get('miscRating'),
    ]).toEqual(['5', '4', '3']);
    expect(form.get('reviewText')).toBe('Great flavours.');
    expect(form.has('itemId')).toBeFalse(); // no dish chosen
    req.flush({ id: 1, status: 'Pending' }, { status: 201, statusText: 'Created' });
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(['/restaurants', 'r-1'], {
      state: { reviewSubmitted: true },
    });
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it('sends the chosen dish', async () => {
    const { el, open, rateAll, write, submit, reviewRequest, fixture } = setup();
    await open();
    rateAll();
    write('Nice');
    const select = el.querySelector<HTMLSelectElement>('#dish');
    if (!select) throw new Error('No dish select');
    select.value = '9';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    submit();
    expect((reviewRequest().request.body as FormData).get('itemId')).toBe('9');
  });

  describe('photo', () => {
    it('is optional: a review without one sends no image', async () => {
      const { open, rateAll, write, submit, reviewRequest } = setup();
      await open();
      rateAll();
      write('No photo');
      submit();
      expect((reviewRequest().request.body as FormData).has('images')).toBeFalse();
    });

    it('rights gate — Submit stays disabled until the photo is confirmed as shareable', async () => {
      const { el, open, rateAll, write, addPhoto, confirmRights, submitButton } = setup();
      await open();
      rateAll();
      write('With photo');
      expect(submitButton()?.disabled).toBeFalse();

      await addPhoto();
      expect(submitButton()?.disabled).toBeTrue();
      expect(el.textContent).toContain('Confirm you may share your photo');
      confirmRights();
      expect(submitButton()?.disabled).toBeFalse();
    });

    it('BB11 — sends the shrunk photo with the review as the `images` file', async () => {
      const { open, rateAll, write, addPhoto, confirmRights, submit, reviewRequest } = setup();
      await open();
      rateAll();
      write('With photo');
      await addPhoto();
      confirmRights();
      submit();
      const sent = (reviewRequest().request.body as FormData).get('images');
      expect(sent instanceof File).toBeTrue();
      expect((sent as File).type).toBe('image/jpeg');
    });

    it('a failed send keeps the chosen photo, ready for Retry', async () => {
      const {
        el,
        open,
        rateAll,
        write,
        addPhoto,
        confirmRights,
        submit,
        submitButton,
        reviewRequest,
        fixture,
      } = setup();
      await open();
      rateAll();
      write('With photo');
      await addPhoto();
      confirmRights();
      submit();
      reviewRequest().flush({}, { status: 500, statusText: 'x' });
      await fixture.whenStable();
      fixture.detectChanges();
      expect(el.querySelector('img.preview')).not.toBeNull();
      expect(submitButton()?.textContent?.trim()).toBe('Retry');
      expect(submitButton()?.disabled).toBeFalse();
    });
  });

  it('counts the characters of the text', async () => {
    const { el, open, write } = setup();
    await open();
    write('Hello');
    expect(el.querySelector('#review-count')?.textContent).toBe('5 / 2000');
  });

  describe('when sending fails', () => {
    it('keeps everything typed, explains what to do, and offers Retry that sends again', async () => {
      const { el, open, rateAll, write, submit, submitButton, reviewRequest, navigate, fixture } =
        setup();
      await open();
      rateAll(5, 4, 3);
      write('Great flavours.');
      submit();
      reviewRequest().flush(
        { error: { code: 'INTERNAL_ERROR', message: 'Server error.' } },
        { status: 500, statusText: 'x' },
      );
      await fixture.whenStable();
      fixture.detectChanges();

      expect(el.querySelector('[role=alert]')?.textContent).toContain(
        'We couldn’t send your review.',
      );
      expect(el.querySelector('textarea')?.value).toBe('Great flavours.');
      expect(el.querySelector<HTMLInputElement>('input[name=food]:checked')?.value).toBe('5');
      expect(submitButton()?.textContent?.trim()).toBe('Retry');
      expect(submitButton()?.disabled).toBeFalse();
      expect(navigate).not.toHaveBeenCalled();

      submit();
      reviewRequest().flush({ id: 2 }, { status: 201, statusText: 'Created' });
      await fixture.whenStable();
      expect(navigate).toHaveBeenCalled();
    });

    it('shows the server’s field errors next to their fields', async () => {
      const { el, open, rateAll, write, submit, reviewRequest, fixture } = setup();
      await open();
      rateAll();
      write('Nice');
      submit();
      reviewRequest().flush(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request failed validation',
            details: { fieldErrors: { reviewText: ['Review text is required'] } },
          },
        },
        { status: 400, statusText: 'x' },
      );
      await fixture.whenStable();
      fixture.detectChanges();
      expect(el.querySelector('.field .field-error')?.textContent).toBe('Review text is required');
    });

    it('does not send twice while a request is in flight', async () => {
      const { open, rateAll, write, submit, submitButton, reviewRequest } = setup();
      await open();
      rateAll();
      write('Nice');
      submit();
      expect(submitButton()?.disabled).toBeTrue();
      submit(); // a second Enter press
      reviewRequest(); // exactly one request exists (expectOne would fail on two)
    });
  });

  describe('draft', () => {
    it('is saved as you type, per restaurant', async () => {
      const { open, rateAll, write } = setup();
      await open();
      rateAll(2, 3, 4);
      write('Work in progress');
      expect(JSON.parse(sessionStorage.getItem(KEY) ?? '{}')).toEqual({
        food: 2,
        service: 3,
        misc: 4,
        text: 'Work in progress',
        itemId: null,
      });
    });

    it('is restored when the page is opened again (after a failure, reload or re-login)', async () => {
      sessionStorage.setItem(
        KEY,
        JSON.stringify({ food: 5, service: 4, misc: 3, text: 'Saved text', itemId: 7 }),
      );
      const { el, open, submitButton } = setup();
      await open();
      expect(el.querySelector('textarea')?.value).toBe('Saved text');
      expect(el.querySelector<HTMLInputElement>('input[name=service]:checked')?.value).toBe('4');
      expect(el.querySelector<HTMLSelectElement>('#dish')?.value).toBe('7');
      expect(submitButton()?.disabled).toBeFalse();
    });

    it('ignores a damaged draft', async () => {
      sessionStorage.setItem(KEY, '{not json');
      const { el, open } = setup();
      await open();
      expect(el.querySelector('textarea')?.value).toBe('');
    });
  });
});
