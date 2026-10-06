import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { apiInterceptor } from '../../core/api.interceptor';
import { formatLkr } from '../../core/format';
import type { MenuItem } from '../../core/menu';
import { MenuItemsPanelComponent } from './menu-items-panel.component';

/** Lets a resource start its request (open requests keep `whenStable` waiting). */
const tick = () => new Promise((done) => setTimeout(done));

const kottu: MenuItem = {
  id: 5,
  name: 'Kottu',
  priceLkr: '1200',
  isVegetarian: false,
  isVegan: false,
  isHalal: true,
  spiceLevel: 'Hot',
  imageUrl: null,
  categoryId: 1,
};

async function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(withInterceptors([apiInterceptor])), provideHttpClientTesting()],
  });
  const backend = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(MenuItemsPanelComponent);
  const el = fixture.nativeElement as HTMLElement;
  fixture.componentRef.setInput('restaurantId', 'r-1');
  fixture.detectChanges();
  await tick();
  const one = (path: string) => backend.expectOne((r) => r.url.endsWith(path));
  const menu = one('/restaurants/r-1/menu');
  expect(menu.request.headers.get('Cache-Control')).toBe('no-cache'); // prices are never cached
  menu.flush([kottu]);
  one('/categories').flush([{ id: 1, name: 'Rice' }]);
  await tick();
  fixture.detectChanges();
  return { backend, fixture, el, one };
}

type Setup = Awaited<ReturnType<typeof setup>>;

const button = (el: HTMLElement, text: string) =>
  [...el.querySelectorAll('button')].find((b) => b.textContent?.includes(text));
const set = (el: HTMLElement, selector: string, value: string) => {
  const control = el.querySelector<HTMLInputElement>(selector);
  if (!control) throw new Error(`No ${selector}`);
  control.value = value;
  control.dispatchEvent(new Event('input'));
};
const field = (req: { request: { body: unknown } }, name: string) =>
  (req.request.body as FormData).get(name);

async function realPicture(): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 40;
  canvas.getContext('2d')?.fillRect(0, 0, 40, 40);
  const blob = await new Promise<Blob | null>((done) => {
    canvas.toBlob(done, 'image/png');
  });
  return new File([blob ?? new Blob()], 'dish.png', { type: 'image/png' });
}

/** Picks a file the way the browser does, then waits for it to be processed. */
async function pickFile({ fixture, el }: Setup, file: File) {
  const input = el.querySelector<HTMLInputElement>('input[type=file]');
  if (!input) throw new Error('No file input');
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
  input.dispatchEvent(new Event('change'));
  await new Promise((done) => setTimeout(done, 150)); // image decoding is not tracked by Angular
  fixture.detectChanges();
}

/** Opens Edit on the first dish, sets its price and presses Save. */
function editPrice({ fixture, el }: Setup, price: string) {
  button(el, 'Edit')?.click();
  fixture.detectChanges();
  set(el, '#dish-0-price', price);
  button(el, 'Save dish')?.click();
  fixture.detectChanges();
}

describe('MenuItemsPanelComponent', () => {
  it('BB18: shows the price the server saved, not the one that was typed', async () => {
    const s = await setup();
    expect(s.el.textContent).toContain(formatLkr('1200'));
    editPrice(s, '1500');

    const put = s.one('/admin/restaurants/r-1/menu-items/5');
    expect(put.request.method).toBe('PUT');
    expect(field(put, 'priceLkr')).toBe('1500');
    put.flush({ ...kottu, priceLkr: '1499.5' });
    s.fixture.detectChanges();

    expect(s.el.textContent).toContain(formatLkr('1499.5'));
    expect(s.el.textContent).not.toContain(formatLkr('1200'));
    expect(s.el.querySelector('form')).toBeNull();
  });

  it('rejects −1 and sends nothing', async () => {
    const s = await setup();
    editPrice(s, '-1');

    expect(s.el.textContent).toContain('The price cannot be negative.');
    s.backend.expectNone((r) => r.url.includes('/menu-items'));
  });

  it('accepts 0', async () => {
    const s = await setup();
    editPrice(s, '0');

    expect(field(s.one('/admin/restaurants/r-1/menu-items/5'), 'priceLkr')).toBe('0');
  });

  it('sends the dietary and spice values the API expects', async () => {
    const s = await setup();
    button(s.el, 'Add a dish')?.click();
    s.fixture.detectChanges();
    set(s.el, '#dish-0-name', 'Dhal');
    set(s.el, '#dish-0-price', '350');
    const [category, spice] = s.el.querySelectorAll('select');
    category.selectedIndex = 1;
    category.dispatchEvent(new Event('change'));
    spice.selectedIndex = 4;
    spice.dispatchEvent(new Event('change'));
    s.el.querySelector<HTMLInputElement>('[formControlName=isVegan]')?.click();
    s.el.querySelector<HTMLInputElement>('[formControlName=isHalal]')?.click();
    button(s.el, 'Save dish')?.click();

    const post = s.one('/admin/restaurants/r-1/menu-items');
    expect(post.request.method).toBe('POST');
    expect(
      ['isVegetarian', 'isVegan', 'isHalal', 'spiceLevel', 'categoryId'].map((n) => field(post, n)),
    ).toEqual(['false', 'true', 'true', 'Extra_Hot', '1']);
    post.flush({ ...kottu, id: 6, name: 'Dhal' });
    s.fixture.detectChanges();

    expect(s.el.textContent).toContain('Dhal');
  });

  it('warns about linked reviews and deletes once the name is typed', async () => {
    const s = await setup();
    button(s.el, 'Delete')?.click();
    s.fixture.detectChanges();
    await tick();

    const dialog = s.el.querySelector('dialog');
    expect(dialog?.open).toBeTrue();
    expect(dialog?.textContent).toContain('the link from any review that mentions this dish');
    set(s.el, '#confirm-name', 'Kottu');
    s.fixture.detectChanges();
    dialog?.querySelector<HTMLButtonElement>('button.danger')?.click();

    const del = s.one('/admin/restaurants/r-1/menu-items/5');
    expect(del.request.method).toBe('DELETE');
    del.flush(null, { status: 204, statusText: 'No Content' });
    s.fixture.detectChanges();

    expect(s.el.textContent).toContain('No dishes yet.');
  });

  it('sends a chosen dish photo with the save, shrunk to a JPEG', async () => {
    const s = await setup();
    button(s.el, 'Edit')?.click();
    s.fixture.detectChanges();
    await pickFile(s, await realPicture());
    button(s.el, 'Save dish')?.click();

    const put = s.one('/admin/restaurants/r-1/menu-items/5');
    expect((field(put, 'image') as File).type).toBe('image/jpeg');
  });

  it('rejects a file that is not an image before anything is uploaded', async () => {
    const s = await setup();
    button(s.el, 'Edit')?.click();
    s.fixture.detectChanges();
    await pickFile(s, new File(['hello'], 'notes.txt', { type: 'text/plain' }));

    expect(s.el.textContent).toContain('Choose a JPEG, PNG or WebP image.');
    button(s.el, 'Save dish')?.click();
    expect(field(s.one('/admin/restaurants/r-1/menu-items/5'), 'image')).toBeNull();
  });
});
