import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { RequireLogin } from '../../core/require-login';

/** "Write a review": a Guest is asked to log in first; the review form itself is DSR2P-17. */
@Component({
  selector: 'app-write-review-button',
  template: '<button type="button" class="btn" (click)="write()">Write a review</button>',
})
export class WriteReviewButtonComponent {
  readonly restaurantId = input.required<string>();
  private readonly requireLogin = inject(RequireLogin);
  private readonly router = inject(Router);

  protected write(): void {
    this.requireLogin.run('Log in to write a review.', () => {
      void this.router.navigate(['/restaurants', this.restaurantId(), 'review']);
    });
  }
}
