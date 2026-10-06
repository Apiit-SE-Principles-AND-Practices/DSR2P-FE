import { TestBed } from '@angular/core/testing';
import type { MenuItem } from '../../core/menu';
import { MenuItemRowComponent } from './menu-item-row.component';

const NBSP = ' '; // Intl keeps the currency and the number together

const dish: MenuItem = {
  id: 1,
  name: 'Vegetable Rice & Curry',
  priceLkr: '900',
  isVegetarian: true,
  isVegan: true,
  isHalal: true,
  spiceLevel: 'Medium',
  imageUrl: null,
  categoryId: 4,
};

function render(overrides: Partial<MenuItem> = {}) {
  const fixture = TestBed.createComponent(MenuItemRowComponent);
  fixture.componentRef.setInput('item', { ...dish, ...overrides });
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}
const tags = (el: HTMLElement) =>
  Array.from(el.querySelectorAll('.tag')).map((t) => t.textContent?.replace(/\s+/g, ' ').trim());

describe('MenuItemRowComponent', () => {
  it('shows the name and the formatted price together on the first line', () => {
    const line = render().querySelector('.line');
    expect(line?.querySelector('.name')?.textContent).toBe('Vegetable Rice & Curry');
    expect(line?.querySelector('.price')?.textContent).toBe(`LKR${NBSP}900`);
  });

  it('labels dietary flags and spice in text (vegan implies vegetarian, so only one is shown)', () => {
    expect(tags(render())).toEqual(['✓ Vegan', '✓ Halal', '🌶🌶 Medium spice']);
  });

  it('shows Vegetarian when not vegan, and omits flags that do not apply', () => {
    expect(tags(render({ isVegan: false, isHalal: false, spiceLevel: 'Hot' }))).toEqual([
      '✓ Vegetarian',
      '🌶🌶🌶 Hot spice',
    ]);
  });

  it('says "Not spicy" with no chillies for spice level None', () => {
    expect(
      tags(render({ isVegetarian: false, isVegan: false, isHalal: false, spiceLevel: 'None' })),
    ).toEqual(['Not spicy']);
  });

  it('keeps the chilli icons out of the accessibility tree', () => {
    expect(render().querySelector('.tag [aria-hidden=true]')?.textContent).toBe('🌶🌶');
  });
});
