import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RequireLogin } from '../core/require-login';
import { SessionStore } from '../core/session.store';
import { LoginPromptComponent } from './login-prompt.component';

/** Stands in for a login-only action such as the Like button (DSR2P-22). */
@Component({
  selector: 'app-host',
  imports: [LoginPromptComponent],
  template: `
    <button type="button" (click)="like()">Like</button>
    <app-login-prompt />
  `,
})
class HostComponent {
  private readonly requireLogin = inject(RequireLogin);
  readonly requests = jasmine.createSpy('request');

  like(): void {
    this.requireLogin.run('Log in to like reviews.', this.requests);
  }
}

function setup() {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const dialog = el.querySelector('dialog');
  const like = el.querySelector('button');
  if (!dialog || !like) throw new Error('Host did not render');
  const click = () => {
    like.focus();
    like.click();
    fixture.detectChanges();
  };
  return { fixture, dialog, like, click };
}

describe('LoginPrompt / RequireLogin', () => {
  it('a Guest clicking Like sees the prompt and no request is made', () => {
    const { fixture, dialog, click } = setup();
    click();
    expect(dialog.open).toBeTrue();
    expect(dialog.textContent).toContain('Log in to like reviews.');
    expect(fixture.componentInstance.requests).not.toHaveBeenCalled();
  });

  it('closing the prompt returns focus to the button that opened it', () => {
    const { fixture, dialog, like, click } = setup();
    click();
    dialog.close();
    fixture.detectChanges();
    expect(dialog.open).toBeFalse();
    expect(document.activeElement).toBe(like);
  });

  it('offers Log in and Register links that carry the current page', () => {
    const { dialog, click } = setup();
    click();
    const links = Array.from(dialog.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(links[0]).toContain('/login');
    expect(links[1]).toContain('/register');
  });

  it('a signed-in user runs the action and sees no prompt', () => {
    const { fixture, dialog, click } = setup();
    TestBed.inject(SessionStore).start({
      token: 't',
      user: { id: '1', name: 'Ann', email: 'a@b.lk', role: 'Customer', language: 'en' },
    });
    click();
    expect(dialog.open).toBeFalse();
    expect(fixture.componentInstance.requests).toHaveBeenCalledTimes(1);
  });
});
