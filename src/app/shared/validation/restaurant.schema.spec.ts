import { restaurantSchema } from './restaurant.schema';
import { fieldPath, issueMessages } from './zod-validator';

const dish = {
  name: 'Rice',
  priceLkr: 500,
  categoryId: 1,
  isVegetarian: false,
  isVegan: false,
  isHalal: true,
  spiceLevel: 'Mild',
};
const valid = {
  name: 'Lanka',
  city: 'Colombo',
  categoryIds: [1],
  address: '1 Rd',
  imageUrl: '',
  menuItems: [dish],
};

describe('restaurantSchema', () => {
  it('accepts a complete restaurant, with an optional image', () => {
    expect(restaurantSchema.safeParse(valid).success).toBeTrue();
  });

  it('keys a bad dish field by its path', () => {
    const result = restaurantSchema.safeParse({
      ...valid,
      menuItems: [dish, { ...dish, priceLkr: -1 }],
    });
    expect(result.success ? {} : issueMessages(result.error)).toEqual({
      'menuItems.1.priceLkr': 'The price cannot be negative.',
    });
  });

  it('needs a category, a name and an https image address', () => {
    const result = restaurantSchema.safeParse({
      ...valid,
      name: ' ',
      categoryIds: [],
      imageUrl: 'http://x.lk/a.png',
    });
    expect(Object.keys(result.success ? {} : issueMessages(result.error))).toEqual([
      'name',
      'categoryIds',
      'imageUrl',
    ]);
  });

  it('allows at most 2 decimal places in a price', () => {
    expect(
      restaurantSchema.safeParse({ ...valid, menuItems: [{ ...dish, priceLkr: 9.99 }] }).success,
    ).toBeTrue();
    expect(
      restaurantSchema.safeParse({ ...valid, menuItems: [{ ...dish, priceLkr: 9.999 }] }).success,
    ).toBeFalse();
  });
});

describe('fieldPath', () => {
  it('turns the API nested key into the form path', () => {
    expect(fieldPath('menuItems[2].priceLkr')).toBe('menuItems.2.priceLkr');
    expect(fieldPath('name')).toBe('name');
  });
});
