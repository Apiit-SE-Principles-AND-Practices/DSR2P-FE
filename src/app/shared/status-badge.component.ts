import { Component, input } from '@angular/core';
import type { ModerationStatus } from '../core/account.service';

const BADGES: Record<ModerationStatus, { icon: string; label: string }> = {
  Pending: { icon: '⏳', label: 'Pending review' },
  Approved: { icon: '✓', label: 'Published' },
  Rejected: { icon: '✕', label: 'Rejected' },
};

/** A moderation status as an icon plus words; colour only reinforces it. */
@Component({
  selector: 'app-status-badge',
  styleUrl: './status-badge.component.css',
  template: `
    <span class="badge" [class]="status().toLowerCase()">
      <span aria-hidden="true">{{ badge().icon }}</span> {{ badge().label }}
    </span>
  `,
})
export class StatusBadgeComponent {
  readonly status = input.required<ModerationStatus>();
  protected badge() {
    return BADGES[this.status()];
  }
}
