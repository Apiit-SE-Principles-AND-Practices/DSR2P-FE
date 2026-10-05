import { Component, input } from '@angular/core';
import { PASSWORD_RULES } from './validation/register.schema';

/** Live checklist of the password rules. Met/not met is stated in text, not colour alone. */
@Component({
  selector: 'app-password-rules',
  template: `
    <ul class="rules">
      @for (rule of rules; track rule.label) {
        <li [class.met]="rule.test(password())">
          {{ rule.test(password()) ? '✓' : '○' }} {{ rule.label }}
          <span class="sr-only">{{ rule.test(password()) ? '(met)' : '(not met)' }}</span>
        </li>
      }
    </ul>
  `,
})
export class PasswordRulesComponent {
  readonly password = input('');
  protected readonly rules = PASSWORD_RULES;
}
