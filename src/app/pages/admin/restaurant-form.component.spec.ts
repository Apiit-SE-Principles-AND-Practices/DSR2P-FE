import { Component } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { apiInterceptor } from '../../core/api.interceptor';
import { unsavedChangesGuard } from '../../core/guards';
import { RestaurantFormComponent } from './restaurant-form.component';

@Component({ template: 'list' })
class ListStubComponent {}

/** The request for `path`: the interceptor puts the API address in front of it. */
const one = (backend: HttpTestingController, path: string) =>
  backend.expectOne((r) => r.url.endsWith(path));

const CATEGORIES = [
  { id: 1, name: 'Rice' },
  { id: 2, name: 'Curry' },
];

async function setup(url = '/admin/restaurants/new') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'admin/restaurants', component: ListStubComponent },
        {
          path: 'admin/restaurants/new',
          component: RestaurantFormComponent,
          canDeactivate: [unsavedChangesGuard],
        },
        { path: 'admin/restaurants/:id/edit', component: RestaurantFormComponent },
      ]),
      provideHttpClient(withInterceptors([apiInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  const backend = TestBed.inject(HttpTestingController);
  const harness = await RouterTestingHarness.create();
  const form = await harness.navigateByUrl(url, RestaurantFormComponent);
  const el = harness.fixture.nativeElement as HTMLElement;
  one(backend, '/categories').flush(CATEGORIES);
  if (url.endsWith('/edit')) {
    one(backend, '/restaurants/r-1').flush({
      id: 'r-1',
      name: 'Old Name',
      city: 'Kandy',
      address: '1 Hill Rd',
      imageUrl: null,
      categories: [CATEGORIES[1]],
    });
    one(backend, '/restaurants/r-1/menu').flush([]); // the menu panel
  }
  await harness.fixture.whenStable();
  harness.detectChanges();
  return { backend, harness, form, el };
}

type Setup = Awaited<ReturnType<typeof setup>>;

const set = (el: HTMLElement, selector: string, value: string, event = 'input') => {
  const control = el.querySelector<HTMLInputElement | HTMLSelectElement>(selector);
  if (!control) throw new Error(`No ${selector}`);
  control.value = value;
  control.dispatchEvent(new Event(event));
};
const pick = (el: HTMLElement, selector: string, index: number) => {
  const select = el.querySelector<HTMLSelectElement>(selector);
  if (!select) throw new Error(`No ${selector}`);
  select.selectedIndex = index;
  select.dispatchEvent(new Event('change'));
};

/** Fills the restaurant fields and `dishes` dishes, then presses Save. */
function fillAndSave({ harness, el }: Setup, dishes: number) {
  set(el, '#name', 'Lanka Kitchen');
  set(el, '#address', '1 Galle Rd');
  set(el, '#city', 'Colombo', 'change');
  el.querySelector<HTMLInputElement>('fieldset input[type=checkbox]')?.click();
  for (let i = 0; i < dishes; i++) {
    [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Add a dish'))?.click();
    harness.detectChanges();
    set(el, `#dish-${String(i)}-name`, `Dish ${String(i + 1)}`);
    set(el, `#dish-${String(i)}-price`, String(500 + i));
    pick(el, `#dish-${String(i)}-category`, 1);
  }
  harness.detectChanges();
  el.querySelector<HTMLButtonElement>('button[type=submit]')?.click();
  harness.detectChanges();
}

const dishName = (req: { request: { body: unknown } }) =>
  (req.request.body as FormData).get('name');

describe('RestaurantFormComponent', () => {
  it('BB17: creating with two dishes creates the restaurant, then adds both and goes back to the list', async () => {
    const s = await setup();
    fillAndSave(s, 2);

    const create = one(s.backend, '/admin/restaurants');
    expect(create.request.body).toEqual({
      name: 'Lanka Kitchen',
      city: 'Colombo',
      categoryIds: [1],
      address: '1 Galle Rd',
    });
    create.flush({ id: 'r-9' });
    const first = one(s.backend, '/admin/restaurants/r-9/menu-items');
    expect(dishName(first)).toBe('Dish 1');
    first.flush({});
    const second = one(s.backend, '/admin/restaurants/r-9/menu-items');
    expect(dishName(second)).toBe('Dish 2');
    second.flush({});
    await s.harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/admin/restaurants');
  });

  it('shows the schema messages and sends nothing while the form is invalid', async () => {
    const s = await setup();
    s.el.querySelector<HTMLButtonElement>('button[type=submit]')?.click();
    s.harness.detectChanges();

    expect(s.el.textContent).toContain('Enter a name.');
    expect(s.el.textContent).toContain('Choose at least one category.');
    s.backend.expectNone((r) => r.url.endsWith('/admin/restaurants'));
  });

  it('puts a nested server error on the right dish', async () => {
    const s = await setup();
    fillAndSave(s, 2);
    one(s.backend, '/admin/restaurants').flush(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid',
          details: { fieldErrors: { 'menuItems[1].priceLkr': ['Too expensive'] } },
        },
      },
      { status: 400, statusText: 'Bad Request' },
    );
    s.harness.detectChanges();

    const dishes = s.el.querySelectorAll('app-menu-item-fieldset');
    expect(dishes[0].textContent).not.toContain('Too expensive');
    expect(dishes[1].textContent).toContain('Too expensive');
  });

  it('keeps only the failed dish and retries just that one, without creating the restaurant again', async () => {
    const s = await setup();
    fillAndSave(s, 2);
    one(s.backend, '/admin/restaurants').flush({ id: 'r-9' });
    one(s.backend, '/admin/restaurants/r-9/menu-items').flush({});
    one(s.backend, '/admin/restaurants/r-9/menu-items').flush(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid',
          details: { fieldErrors: { priceLkr: ['Too high'] } },
        },
      },
      { status: 400, statusText: 'Bad Request' },
    );
    s.harness.detectChanges();

    expect(s.el.querySelectorAll('app-menu-item-fieldset').length).toBe(1);
    expect(s.el.textContent).toContain('Too high');

    s.el.querySelector<HTMLButtonElement>('button[type=submit]')?.click();
    s.backend.expectNone((r) => r.url.endsWith('/admin/restaurants'));
    const retry = one(s.backend, '/admin/restaurants/r-9/menu-items');
    expect(dishName(retry)).toBe('Dish 2');
  });

  it('edits an existing restaurant with a PUT and no dishes', async () => {
    const s = await setup('/admin/restaurants/r-1/edit');
    expect(s.el.querySelector<HTMLInputElement>('#name')?.value).toBe('Old Name');
    expect(s.el.querySelector('app-menu-item-fieldset')).toBeNull();
    expect(s.form.hasUnsavedChanges()).toBeFalse();

    set(s.el, '#name', 'New Name');
    expect(s.form.hasUnsavedChanges()).toBeTrue();
    s.el.querySelector<HTMLButtonElement>('button[type=submit]')?.click();

    const update = one(s.backend, '/admin/restaurants/r-1');
    expect(update.request.method).toBe('PUT');
    expect((update.request.body as { name: string }).name).toBe('New Name');
  });

  it('rejects an address that is not https, and one that does not open as an image', async () => {
    const s = await setup();
    set(s.el, '#image-url', 'http://example.lk/a.png');
    s.el.querySelector<HTMLButtonElement>('button[type=submit]')?.click();
    s.harness.detectChanges();
    expect(s.el.textContent).toContain('Enter a full address starting with https://');

    fillAndSave(s, 0);
    set(s.el, '#image-url', 'https://example.lk/missing.png');
    s.harness.detectChanges();
    s.el.querySelector('img')?.dispatchEvent(new Event('error'));
    s.el.querySelector<HTMLButtonElement>('button[type=submit]')?.click();
    s.harness.detectChanges();

    expect(s.el.textContent).toContain('does not open as an image');
    s.backend.expectNone((r) => r.url.endsWith('/admin/restaurants'));
  });
});
