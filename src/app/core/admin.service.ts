import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY, expand, forkJoin, map, reduce, type Observable } from 'rxjs';
import type { z } from 'zod/mini';
import type { menuItemSchema } from '../shared/validation/restaurant.schema';
import { ALL_CITIES } from './api.interceptor';
import type { Category } from './category.service';
import type { MenuItem } from './menu';
import type { ModerationKind, ModerationQueue } from './moderation';
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

interface StatusCounts {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

/** Mirrors the OpenAPI `DashboardStats`. It has no menu item count. */
export interface DashboardStats {
  restaurants: number;
  users: number;
  reviews: StatusCounts;
  comments: StatusCounts;
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

  /** Every restaurant in every city, A to Z: one request (more only if there are over 100). */
  list(): Observable<AdminRestaurant[]> {
    const page = (number: number) =>
      this.http.get<{ data: AdminRestaurant[]; page: number; totalPages: number }>('/restaurants', {
        params: { page: number, pageSize: 100 },
        context: new HttpContext().set(ALL_CITIES, true),
      });
    return page(1).pipe(
      expand((last) => (last.page < last.totalPages ? page(last.page + 1) : EMPTY)),
      reduce((all, { data }) => [...all, ...data], [] as AdminRestaurant[]),
      map((all) => all.sort((a, b) => a.name.localeCompare(b.name))),
    );
  }

  stats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>('/admin/dashboard/stats', {
      headers: { 'Cache-Control': 'no-cache' },
    });
  }

  queue(): Observable<ModerationQueue> {
    return this.http.get<ModerationQueue>('/admin/moderation/queue', {
      headers: { 'Cache-Control': 'no-cache' },
    });
  }

  approve(kind: ModerationKind, id: number): Observable<unknown> {
    return this.http.patch(`/admin/${kind}/${String(id)}/approve`, null);
  }

  /** The reason is required and is shown to the author. */
  reject(kind: ModerationKind, id: number, reason: string): Observable<unknown> {
    return this.http.patch(`/admin/${kind}/${String(id)}/reject`, { reason });
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
