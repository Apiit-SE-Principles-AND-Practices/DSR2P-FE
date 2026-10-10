import { Type } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BottomTabBarComponent } from './bottom-tab-bar.component';
import { NAV_ITEMS } from './nav-items';
import { SessionStore } from '../core/session.store';
import { TopNavComponent } from './top-nav.component';

describe('navigation components', () => {
  [TopNavComponent, BottomTabBarComponent].forEach((component: Type<unknown>) => {
    it(`${component.name} marks only the active link with aria-current="page"`, async () => {
      TestBed.configureTestingModule({
        providers: [provideRouter([{ path: '**', children: [] }]), provideHttpClient()],
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

  it('TopNavComponent shows the user name instead of Login, with Logout in a menu', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', children: [] }]), provideHttpClient()],
    });
    TestBed.inject(SessionStore).start({
      token: 't',
      user: { id: '1', name: 'Nimal', email: 'n@x.lk', role: 'Customer', language: 'en' },
    });
    const fixture = TestBed.createComponent(TopNavComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('Login');
    const button = el.querySelector<HTMLButtonElement>('.user-button');
    if (!button) throw new Error('No user button');
    expect(button.textContent).toContain('Nimal');
    expect(el.querySelector('[role=menu]')).toBeNull();

    button.click();
    fixture.detectChanges();
    const logout = Array.from(el.querySelectorAll<HTMLButtonElement>('[role=menuitem]')).find((b) =>
      b.textContent?.includes('Logout'),
    );
    if (!logout) throw new Error('No logout button');
    logout.click();
    fixture.detectChanges();
    expect(TestBed.inject(SessionStore).isAuthenticated()).toBeFalse();
    expect(el.textContent).toContain('Login');
  });
});
