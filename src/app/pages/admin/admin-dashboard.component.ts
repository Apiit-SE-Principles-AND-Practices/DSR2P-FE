import { Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { AdminService } from '../../core/admin.service';
import { AdminStatTileComponent } from '../../shared/admin-stat-tile.component';
import { InlineErrorComponent } from '../../shared/inline-error.component';
import { SkeletonComponent } from '../../shared/skeleton.component';

const queue = (type: string) => ({ path: '/admin/moderation', query: { type } });

/** Admin home: counts at a glance, with pending moderation work flagged. Refreshes when the tab regains focus. */
@Component({
  selector: 'app-admin-dashboard',
  imports: [AdminStatTileComponent, InlineErrorComponent, SkeletonComponent],
  styleUrl: './admin-dashboard.component.css',
  host: { '(window:focus)': 'stats.reload()' },
  template: `
    <h1>Admin dashboard</h1>
    @let s = stats.value();
    @if (stats.error()) {
      <app-inline-error message="Could not load the dashboard." (retry)="stats.reload()" />
    } @else if (s) {
      <div class="grid">
        <app-admin-stat-tile
          label="Pending reviews"
          [value]="s.reviews.pending"
          [action]="reviewsQueue"
        />
        <app-admin-stat-tile
          label="Pending replies"
          [value]="s.comments.pending"
          [action]="commentsQueue"
        />
        <app-admin-stat-tile label="Restaurants" [value]="s.restaurants" />
        <app-admin-stat-tile label="Users" [value]="s.users" />
      </div>
    } @else {
      <app-skeleton height="var(--space-12)" />
    }
  `,
})
export class AdminDashboardComponent {
  private readonly admin = inject(AdminService);
  protected readonly reviewsQueue = queue('reviews');
  protected readonly commentsQueue = queue('comments');
  protected readonly stats = rxResource({ loader: () => this.admin.stats() });
}
