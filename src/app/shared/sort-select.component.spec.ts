import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SortSelectComponent } from './sort-select.component';

async function setup(url: string) {
  TestBed.configureTestingModule({ providers: [provideRouter([{ path: '**', children: [] }])] });
  const router = TestBed.inject(Router);
  await router.navigateByUrl(url);
  const fixture = TestBed.createComponent(SortSelectComponent);
  fixture.detectChanges();
  const select = (fixture.nativeElement as HTMLElement).querySelector('select');
  if (!select) throw new Error('No sort select');
  const shown = () => select.selectedOptions[0].textContent;
  const choose = async (value: string) => {
    select.value = value;
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return { router, shown, choose };
}

describe('SortSelectComponent', () => {
  it('defaults to Top rated', async () => {
    expect((await setup('/search')).shown()).toBe('Top rated');
  });

  it('shows the sort from the URL, so the label survives a reload or shared link', async () => {
    expect((await setup('/search?sort=price')).shown()).toBe('Price: low to high');
  });

  it('falls back to the default for an unknown sort', async () => {
    expect((await setup('/search?sort=best')).shown()).toBe('Top rated');
  });

  it('choosing a sort updates the URL and goes back to page 1', async () => {
    const { choose, router } = await setup('/search?city=Kandy&page=3');
    await choose('price');
    expect(router.url).toBe('/search?city=Kandy&sort=price');
  });

  it('choosing the default removes the sort from the URL', async () => {
    const { choose, router } = await setup('/search?sort=price');
    await choose('rating');
    expect(router.url).toBe('/search');
  });
});
