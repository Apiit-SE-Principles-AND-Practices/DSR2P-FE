import { groupMenu, type MenuItem } from './menu';

const item = (id: number, name: string, categoryId: number | null): MenuItem => ({
  id,
  name,
  priceLkr: '900',
  isVegetarian: false,
  isVegan: false,
  isHalal: false,
  spiceLevel: 'None',
  imageUrl: null,
  categoryId,
});
const categories = [
  { id: 2, name: 'Desserts' },
  { id: 5, name: 'Rice' },
  { id: 9, name: 'Soups' },
];

describe('groupMenu', () => {
  it('groups items under their category, in the categories’ order', () => {
    const groups = groupMenu(
      [item(1, 'Biryani', 5), item(2, 'Watalappan', 2), item(3, 'Fried rice', 5)],
      categories,
    );
    expect(groups.map((g) => [g.name, g.items.map((i) => i.name)])).toEqual([
      ['Desserts', ['Watalappan']],
      ['Rice', ['Biryani', 'Fried rice']],
    ]);
  });

  it('drops categories with no dishes', () => {
    expect(groupMenu([item(1, 'Biryani', 5)], categories).map((g) => g.name)).toEqual(['Rice']);
  });

  it('puts uncategorised or unknown-category dishes last under "Other"', () => {
    const groups = groupMenu(
      [item(1, 'Mystery', null), item(2, 'Biryani', 5), item(3, 'Odd', 99)],
      categories,
    );
    expect(groups.map((g) => g.name)).toEqual(['Rice', 'Other']);
    expect(groups[1].items.map((i) => i.name)).toEqual(['Mystery', 'Odd']);
  });

  it('is empty for an empty menu', () => {
    expect(groupMenu([], categories)).toEqual([]);
  });
});
