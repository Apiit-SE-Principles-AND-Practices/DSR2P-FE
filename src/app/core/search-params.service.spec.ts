import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SearchParamsService, toQuery } from './search-params.service';

async function setup(url: string) {
  TestBed.configureTestingModule({
    providers: [provideRouter([{ path: 'search', children: [] }])],
  });
  const router = TestBed.inject(Router);
  await router.navigateByUrl(url);
  return { service: TestBed.inject(SearchParamsService), router };
}

describe('SearchParamsService', () => {
  it('reads valid params from the URL', async () => {
    const { service } = await setup(
      '/search?city=Kandy&q=%20kottu%20&diet=Halal&sort=price&page=3',
    );
    expect(service.params()).toEqual({
      city: 'Kandy',
      q: 'kottu',
      category: undefined,
      diet: 'Halal',
      spice: undefined,
      price: undefined,
      sort: 'price',
      page: 3,
    });
  });

  it('ignores unknown values and bad pages instead of failing', async () => {
    const { service } = await setup('/search?city=Paris&sort=best&diet=Keto&page=-2');
    expect(service.params()).toEqual(jasmine.objectContaining({ page: 1 }));
    const { city, sort, diet } = service.params();
    expect([city, sort, diet]).toEqual([undefined, undefined, undefined]);
  });

  it('updates the URL, resetting to page 1 when a filter changes', async () => {
    const { service, router } = await setup('/search?city=Kandy&page=4');
    await service.update({ diet: 'Vegan' });
    expect(router.url).toBe('/search?city=Kandy&diet=Vegan');
  });

  it('keeps the page when the patch sets it', async () => {
    const { service, router } = await setup('/search?city=Kandy');
    await service.update({ page: 2 });
    expect(router.url).toBe('/search?city=Kandy&page=2');
  });

  it('removes a filter when it is set to undefined', async () => {
    const { service, router } = await setup('/search?city=Galle&diet=Halal&price=Budget');
    await service.update({ diet: undefined, price: undefined });
    expect(router.url).toBe('/search?city=Galle');
  });

  it('navigates to /search from any other page', async () => {
    const { service, router } = await setup('/search');
    await router.navigateByUrl('/');
    await service.update({ category: 'rice' });
    expect(router.url).toBe('/search?category=rice');
  });
});

describe('toQuery', () => {
  it('leaves out empty values and page 1', () => {
    expect(toQuery({ city: 'Colombo', q: undefined, page: 1 })).toEqual({ city: 'Colombo' });
    expect(toQuery({ page: 2 })).toEqual({ page: 2 });
  });
});
