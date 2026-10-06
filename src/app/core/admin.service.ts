import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, type Observable } from 'rxjs';
import type { z } from 'zod/mini';
import type { menuItemSchema } from '../shared/validation/restaurant.schema';
import type { Category } from './category.service';
import type { MenuItem } from './menu';
import { CITIES } from './search-params.service';

export type MenuItemInput = z.infer<typeof menuItemSchema>;

export interface AdminRestaurant {
  id: string;
  name: string;
  city: (typeof CITIES)[number];
  address: string;
  imageUrl: string | null;
  categories: Category[];
}

/** Mirrors the backend `CreateRestaurantInput` / `UpdateRestaurantInput`. */
export interface RestaurantBody {
  name: string;
  city: (typeof CITIES)[number];
  categoryIds: number[];
  address: string;
  imageUrl?: string;
}

/** The API takes menu items as multipart form data (with an optional `image` file). */
const multipart = (item: MenuItemInput, image: File | null): FormData => {
  const form = new FormData();
  Object.entries(item).forEach(([name, value]) => {
    form.append(name, String(value));
  });
  if (image) form.append('image', image, image.name);
  return form;
};

/** Admin-only restaurant and menu management. The server checks the role; these calls need an Admin login. */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  /** Every restaurant, all three cities (the API lists one city at a time), A to Z. */
  list(): Observable<AdminRestaurant[]> {
    return forkJoin(
      CITIES.map((city) =>
        this.http.get<{ data: AdminRestaurant[] }>('/restaurants', {
          params: { city, pageSize: 100 },
        }),
      ),
    ).pipe(
      map((pages) =>
        pages.flatMap(({ data }) => data).sort((a, b) => a.name.localeCompare(b.name)),
      ),
    );
  }

  create(body: RestaurantBody): Observable<AdminRestaurant> {
    return this.http.post<AdminRestaurant>('/admin/restaurants', body);
  }

  update(id: string, body: RestaurantBody): Observable<AdminRestaurant> {
    return this.http.put<AdminRestaurant>(`/admin/restaurants/${id}`, body);
  }

  remove(id: string): Observable<unknown> {
    return this.http.delete<unknown>(`/admin/restaurants/${id}`);
  }

  addMenuItem(
    restaurantId: string,
    item: MenuItemInput,
    image: File | null = null,
  ): Observable<MenuItem> {
    return this.http.post<MenuItem>(
      `/admin/restaurants/${restaurantId}/menu-items`,
      multipart(item, image),
    );
  }

  /** Returns the saved dish: show that, not what was typed. */
  updateMenuItem(
    restaurantId: string,
    itemId: number,
    item: MenuItemInput,
    image: File | null = null,
  ): Observable<MenuItem> {
    return this.http.put<MenuItem>(
      `/admin/restaurants/${restaurantId}/menu-items/${String(itemId)}`,
      multipart(item, image),
    );
  }

  removeMenuItem(restaurantId: string, itemId: number): Observable<unknown> {
    return this.http.delete(`/admin/restaurants/${restaurantId}/menu-items/${String(itemId)}`);
  }

  /** What deleting would remove. The API has no summary, so this counts the menu and the published reviews. */
  impact(id: string): Observable<{ menuItems: number; reviews: number }> {
    return forkJoin({
      menu: this.http.get<unknown[]>(`/restaurants/${id}/menu`),
      reviews: this.http.get<unknown[]>(`/restaurants/${id}/reviews`),
    }).pipe(map(({ menu, reviews }) => ({ menuItems: menu.length, reviews: reviews.length })));
  }
}
