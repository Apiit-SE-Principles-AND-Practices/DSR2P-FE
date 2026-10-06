import { Component, inject } from '@angular/core';
import { activeLanguage, LANGUAGES, setUiLanguage } from '../core/languages';
import { ProfileService } from '../core/profile.service';
import { SessionStore, type Language } from '../core/session.store';
import { ToastService } from './toast.service';

/**
 * Three buttons, always all shown. The choice applies at once, is remembered on this device, and, when
 * signed in, is saved to the account so it follows the user to other devices.
 */
@Component({
  selector: 'app-language-switcher',
  styleUrl: './language-switcher.component.css',
  template: `
    <div role="group" aria-label="Language" class="switcher">
      @for (language of languages; track language.code) {
        <button
          type="button"
          class="option"
          [lang]="language.code"
          [attr.aria-label]="language.label + ' — ' + language.english"
          [attr.aria-current]="current() === language.code ? 'true' : null"
          (click)="choose(language.code)"
        >
          {{ language.short }}
        </button>
      }
    </div>
  `,
})
export class LanguageSwitcherComponent {
  private readonly session = inject(SessionStore);
  private readonly profile = inject(ProfileService);
  private readonly toast = inject(ToastService);

  protected readonly languages = LANGUAGES;
  protected readonly current = activeLanguage;

  protected choose(language: Language): void {
    if (language === this.current()) return;
    setUiLanguage(language);
    if (!this.session.isAuthenticated()) return;
    this.profile.update({ language }).subscribe({
      error: () => {
        this.toast.show(
          'We could not save your language choice. It applies until you leave this page.',
          'error',
        );
      },
    });
  }
}
