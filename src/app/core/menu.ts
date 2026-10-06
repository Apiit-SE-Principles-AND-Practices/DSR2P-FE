import type { Category } from './category.service';
import type { SPICE_LEVELS } from './search-params.service';

/** Mirrors the OpenAPI `MenuItem`. The API sends `priceLkr` as a string such as "1200" despite the spec. */
export interface MenuItem {
  id: number;
  name: string;
  priceLkr: number | string;
  isVegetarian: boolean;
  isVegan: boolean;
  isHalal: boolean;
  spiceLevel: (typeof SPICE_LEVELS)[number];
  imageUrl: string | null;
  categoryId: number | null;
}

export interface MenuGroup {
  name: string;
  items: MenuItem[];
}

/** Items grouped under their category, in the categories' order; uncategorised items go last under "Other". */
export function groupMenu(items: MenuItem[], categories: Category[]): MenuGroup[] {
  const groups = categories.map(({ id, name }) => ({
    name,
    items: items.filter((item) => item.categoryId === id),
  }));
  const other = items.filter((item) => !categories.some(({ id }) => id === item.categoryId));
  return [...groups, { name: 'Other', items: other }].filter((group) => group.items.length > 0);
}
