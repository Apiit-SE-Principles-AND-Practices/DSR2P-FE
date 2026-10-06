import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AdminTableComponent, type AdminColumn } from './admin-table.component';

interface Restaurant {
  id: number;
  name: string;
  city: string;
  items: number;
}
const rows: Restaurant[] = [
  { id: 1, name: 'Sea Spray', city: 'Galle', items: 12 },
  { id: 2, name: 'Kandy Kottu Corner', city: 'Kandy', items: 8 },
];
const columns: AdminColumn<Restaurant>[] = [
  { label: 'Name', value: (r) => r.name },
  { label: 'City', value: (r) => r.city },
  { label: 'Menu items', value: (r) => r.items },
];

/** Stands in for the viewport: `wide` = 640px and up (a table), else cards. */
function fakeViewport(initial: boolean) {
  let onChange: (e: MediaQueryListEvent) => void = () => undefined;
  spyOn(window, 'matchMedia').and.returnValue({
    matches: initial,
    addEventListener: (_: string, fn: typeof onChange) => (onChange = fn),
    removeEventListener: () => undefined,
  } as unknown as MediaQueryList);
  return (matches: boolean) => {
    onChange({ matches } as MediaQueryListEvent);
  };
}

@Component({
  imports: [AdminTableComponent],
  template: `
    <app-admin-table
      caption="Restaurants"
      empty="No restaurants yet."
      [columns]="columns"
      [rows]="data()"
      [rowId]="id"
      [actions]="withActions ? actionsTemplate : undefined"
    />
    <ng-template #actionsTemplate let-row
      ><button type="button">Edit {{ row.name }}</button></ng-template
    >
  `,
})
class HostComponent {
  protected readonly columns = columns;
  readonly data = signal(rows);
  protected readonly id = (r: Restaurant) => r.id;
  withActions = false;
}

function render(wide: boolean, withActions = false) {
  const resize = fakeViewport(wide);
  const fixture = TestBed.createComponent(HostComponent);
  fixture.componentInstance.withActions = withActions;
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { el, fixture, resize, data: fixture.componentInstance.data };
}
const texts = (list: NodeListOf<Element> | Element[]) =>
  Array.from(list).map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim());

describe('AdminTableComponent — 640px and up (a real table)', () => {
  it('is a semantic table with a caption and column headers', () => {
    const { el } = render(true);
    expect(el.querySelector('table')).not.toBeNull();
    expect(el.querySelector('caption')?.textContent?.trim()).toBe('Restaurants');
    expect(texts(el.querySelectorAll('th[scope=col]'))).toEqual(['Name', 'City', 'Menu items']);
    expect(el.querySelector('ul.cards')).toBeNull();
  });

  it('shows one row per item with each column’s value', () => {
    const { el } = render(true);
    const bodyRows = el.querySelectorAll('tbody tr');
    expect(bodyRows.length).toBe(2);
    expect(texts(bodyRows[0].querySelectorAll('td'))).toEqual(['Sea Spray', 'Galle', '12']);
    expect(texts(bodyRows[1].querySelectorAll('td'))).toEqual(['Kandy Kottu Corner', 'Kandy', '8']);
  });

  it('adds an Actions column (named for screen readers) when an actions template is given', () => {
    const { el } = render(true, true);
    expect(texts(el.querySelectorAll('th'))).toEqual(['Name', 'City', 'Menu items', 'Actions']);
    expect(texts(el.querySelectorAll('tbody button'))).toEqual([
      'Edit Sea Spray',
      'Edit Kandy Kottu Corner',
    ]);
  });
});

describe('AdminTableComponent — below 640px (labelled cards)', () => {
  it('shows one card per item and no table', () => {
    const { el } = render(false);
    expect(el.querySelector('table')).toBeNull();
    expect(el.querySelectorAll('ul.cards > li').length).toBe(2);
    expect(el.querySelector('ul.cards')?.getAttribute('aria-label')).toBe('Restaurants');
  });

  it('labels every value with its column name', () => {
    const { el } = render(false);
    const first = el.querySelector('ul.cards > li');
    expect(texts(first?.querySelectorAll('dt') ?? [])).toEqual(['Name', 'City', 'Menu items']);
    expect(texts(first?.querySelectorAll('dd') ?? [])).toEqual(['Sea Spray', 'Galle', '12']);
  });

  it('puts the actions on each card', () => {
    const { el } = render(false, true);
    expect(texts(el.querySelectorAll('.actions button'))).toEqual([
      'Edit Sea Spray',
      'Edit Kandy Kottu Corner',
    ]);
  });
});

describe('AdminTableComponent — both layouts', () => {
  it('swaps between table and cards live when the window crosses 640px', () => {
    const { el, fixture, resize } = render(true);
    expect(el.querySelector('table')).not.toBeNull();
    resize(false);
    fixture.detectChanges();
    expect(el.querySelector('table')).toBeNull();
    expect(el.querySelector('ul.cards')).not.toBeNull();
    resize(true);
    fixture.detectChanges();
    expect(el.querySelector('table')).not.toBeNull();
  });

  [true, false].forEach((wide) => {
    it(`says so, instead of an empty table or list, when there are no rows (${wide ? 'wide' : 'narrow'})`, () => {
      const { el, fixture, data } = render(wide);
      data.set([]);
      fixture.detectChanges();
      expect(el.textContent).toContain('No restaurants yet.');
      expect(el.querySelector('table, ul.cards')).toBeNull();
    });
  });

  it('updates when the rows change, keeping the other rows', () => {
    const { el, fixture, data } = render(true);
    data.set([rows[1]]);
    fixture.detectChanges();
    expect(texts(el.querySelectorAll('tbody tr td:first-child'))).toEqual(['Kandy Kottu Corner']);
  });
});
