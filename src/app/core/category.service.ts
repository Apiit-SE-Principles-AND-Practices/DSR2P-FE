import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { shareReplay } from 'rxjs';

export interface Category {
  id: number;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  /** The full list (alphabetical), fetched once per session; a failed request is retried on the next subscribe. */
  readonly all$ = inject(HttpClient).get<Category[]>('/categories').pipe(shareReplay(1));
}
