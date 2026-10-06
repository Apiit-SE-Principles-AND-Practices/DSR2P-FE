import * as z from 'zod/mini';
import { CITIES, SPICE_LEVELS } from '../../core/search-params.service';

const text = (what: string, max: number) =>
  z
    .string()
    .check(
      z.trim(),
      z.minLength(1, `Enter ${what}.`),
      z.maxLength(max, `Use ${String(max)} characters or fewer.`),
    );

const isHttpsUrl = (value: string): boolean => {
  if (value === '') return true; // the image is optional
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

/** At most 2 decimal places (allowing for floating point, e.g. 0.07 * 100). */
const hasCents = (price: number): boolean => Math.abs(price * 100 - Math.round(price * 100)) < 1e-6;

/** A dish. Limits mirror the backend `CreateMenuItemInput`; also used when editing menu items (DSR2P-30). */
export const menuItemSchema = z.object({
  name: text('a name', 150),
  priceLkr: z
    .number('Enter a price.')
    .check(
      z.minimum(0, 'The price cannot be negative.'),
      z.refine(hasCents, 'Use at most 2 decimal places.'),
    ),
  categoryId: z.int('Choose a category.'),
  isVegetarian: z.boolean(),
  isVegan: z.boolean(),
  isHalal: z.boolean(),
  spiceLevel: z.enum(SPICE_LEVELS, 'Choose a spice level.'),
});

/** A restaurant with its starting menu. Editing sends no dishes: they are added one by one after it is created. */
export const restaurantSchema = z.object({
  name: text('a name', 150),
  city: z.enum(CITIES, 'Choose a city.'),
  categoryIds: z.array(z.int()).check(z.minLength(1, 'Choose at least one category.')),
  address: text('an address', 255),
  imageUrl: z
    .string()
    .check(
      z.trim(),
      z.maxLength(255, 'Use 255 characters or fewer.'),
      z.refine(isHttpsUrl, 'Enter a full address starting with https://'),
    ),
  menuItems: z.array(menuItemSchema),
});
