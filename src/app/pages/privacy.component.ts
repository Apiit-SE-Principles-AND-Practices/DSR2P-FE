import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DATA_COLLECTED } from '../core/privacy';

/** What is collected and why, how long it is kept, and how to get a copy or delete it. */
@Component({
  selector: 'app-privacy',
  imports: [RouterLink],
  template: `
    <h1>Privacy</h1>
    <p>We collect only what an account needs. We do not use your data for advertising.</p>

    <h2>What we collect, and why</h2>
    <ul>
      @for (item of collected; track item.key) {
        <li>
          <strong>{{ item.label }}</strong
          >: {{ item.why }}
        </li>
      }
    </ul>
    <p>
      The reviews, replies and photos you write are also kept, and a review is shown publicly once a
      moderator approves it.
    </p>

    <h2>How long we keep it</h2>
    <p>
      Your data is kept until you delete your account. Deleting it removes your account, your
      reviews and your replies for good.
    </p>

    <h2>Your choices</h2>
    <p>
      You can download a copy of your data, or delete your account, at any time from
      <a routerLink="/account/data">My data</a>.
    </p>
  `,
})
export class PrivacyComponent {
  protected readonly collected = DATA_COLLECTED;
}
