import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ToastService } from '../../shared/toast.service';
import { AdminRestaurantsComponent } from './admin-restaurants.component';

/** Lets a resource start its request (open requests keep `whenStable` waiting). */
const tick = () => new Promise((done) => setTimeout(done));

const restaurant = (id: string, name: string, city: string) => ({
  id,
  name,
  city,
  address: `${name} street`,
  imageUrl: null,
  categories: [{ id: 1, name: 'Rice' }],
});

async function setup() {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  });
  const backend = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(AdminRestaurantsComponent);
  const el = fixture.nativeElement as HTMLElement;
  fixture.detectChanges();
  await tick();
  const all = backend.expectOne((req) => req.url === '/restaurants');
  expect(all.request.params.has('city')).toBeFalse(); // one request for every city
  all.flush({
    data: [restaurant('r-1', 'Lanka Kitchen', 'Colombo'), restaurant('r-2', 'Hill Cafe', 'Kandy')],
    page: 1,
    totalPages: 1,
  });
  fixture.detectChanges();
  await tick();
  fixture.detectChanges();
  return { backend, fixture, el };
}

const set = (el: HTMLElement, selector: string, value: string, event = 'input') => {
  const control = el.querySelector<HTMLInputElement | HTMLSelectElement>(selector);
  if (!control) throw new Error(`No ${selector}`);
  control.value = value;
  control.dispatchEvent(new Event(event));
};

describe('AdminRestaurantsComponent', () => {
  it('lists the restaurants of every city, A to Z', async () => {
    const { el } = await setup();
    const text = el.textContent;
    expect(text).toContain('Lanka Kitchen');
    expect(text).toContain('Hill Cafe');
    expect(text?.indexOf('Hill Cafe')).toBeLessThan(text?.indexOf('Lanka Kitchen') ?? 0);
  });

  it('filters by search text and by city', async () => {
    const { el, fixture } = await setup();
    set(el, '#restaurant-search', 'lanka');
    fixture.detectChanges();
    expect(el.textContent).toContain('Lanka Kitchen');
    expect(el.textContent).not.toContain('Hill Cafe');

    set(el, '#restaurant-search', '');
    set(el, '#restaurant-city', 'Kandy', 'change');
    fixture.detectChanges();
    expect(el.textContent).toContain('Hill Cafe');
    expect(el.textContent).not.toContain('Lanka Kitchen');
  });

  it('shows what a delete removes and only deletes once the name is typed', async () => {
    const { backend, fixture, el } = await setup();
    el.querySelector<HTMLButtonElement>('button.danger')?.click(); // Hill Cafe (A to Z)
    fixture.detectChanges();
    await tick();
    backend.expectOne('/restaurants/r-2/menu').flush([{}, {}, {}]);
    backend.expectOne('/restaurants/r-2/reviews').flush([{}]);
    await tick();
    fixture.detectChanges();

    const dialog = el.querySelector('dialog');
    expect(dialog?.open).toBeTrue();
    expect(dialog?.textContent).toContain('3 menu items');
    expect(dialog?.textContent).toContain('1 reviews');
    const confirm = dialog?.querySelector<HTMLButtonElement>('button.danger');
    expect(confirm?.disabled).toBeTrue();

    set(el, '#confirm-name', 'Hill');
    fixture.detectChanges();
    expect(confirm?.disabled).toBeTrue();
    set(el, '#confirm-name', 'Hill Cafe');
    fixture.detectChanges();
    expect(confirm?.disabled).toBeFalse();

    confirm?.click();
    const del = backend.expectOne('/admin/restaurants/r-2');
    expect(del.request.method).toBe('DELETE');
    del.flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    expect(el.querySelector('dialog')).toBeNull();
    expect(TestBed.inject(ToastService).toasts()[0].message).toBe('Deleted Hill Cafe.');
    backend.match((req) => req.url === '/restaurants'); // the list reloads
  });

  it('closes the dialog without deleting on Cancel', async () => {
    const { backend, fixture, el } = await setup();
    el.querySelector<HTMLButtonElement>('button.danger')?.click();
    fixture.detectChanges();
    backend.match(() => true);
    await tick();

    const closed = new Promise((done) => {
      el.querySelector('dialog')?.addEventListener('close', done); // a dialog reports "close" on a later task
    });
    el.querySelector<HTMLButtonElement>('dialog button.secondary')?.click();
    await closed;
    fixture.detectChanges();

    expect(el.querySelector('dialog')).toBeNull();
    backend.expectNone('/admin/restaurants/r-2');
  });
});
