import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BottomTabBarComponent } from './bottom-tab-bar.component';
import { NAV_ITEMS } from './nav-items';
import { TopNavComponent } from './top-nav.component';

describe('navigation components', () => {
  [TopNavComponent, BottomTabBarComponent].forEach((component: Type<unknown>) => {
    it(`${component.name} marks only the active link with aria-current="page"`, async () => {
      TestBed.configureTestingModule({
        providers: [provideRouter([{ path: '**', children: [] }])],
      });
      await (await RouterTestingHarness.create()).navigateByUrl('/search');
      const fixture = TestBed.createComponent(component);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const links = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('.nav-link'),
      );
      expect(links.length).toBe(NAV_ITEMS.length);
      const current = links.filter((a) => a.getAttribute('aria-current') === 'page');
      expect(current.map((a) => a.textContent)).toEqual(['Search']);
    });
  });
});
