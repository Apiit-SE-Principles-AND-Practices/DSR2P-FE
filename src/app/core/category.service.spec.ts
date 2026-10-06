import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CategoryService, type Category } from './category.service';

const chinese: Category[] = [{ id: 3, name: 'Chinese' }];

describe('CategoryService', () => {
  let service: CategoryService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CategoryService);
    backend = TestBed.inject(HttpTestingController);
  });

  it('fetches /categories once and shares it for the whole session', () => {
    const results: Category[][] = [];
    service.all$.subscribe((categories) => results.push(categories));
    service.all$.subscribe((categories) => results.push(categories));
    backend.expectOne((req) => req.url.endsWith('/categories')).flush(chinese);

    service.all$.subscribe((categories) => results.push(categories)); // later visit: served from cache
    backend.expectNone(() => true);
    expect(results).toEqual([chinese, chinese, chinese]);
  });

  it('retries after a failed request', () => {
    service.all$.subscribe({ error: () => undefined });
    backend.expectOne(() => true).flush({}, { status: 500, statusText: 'x' });

    let result: Category[] = [];
    service.all$.subscribe((categories) => (result = categories));
    backend.expectOne(() => true).flush(chinese);
    expect(result).toEqual(chinese);
  });
});
