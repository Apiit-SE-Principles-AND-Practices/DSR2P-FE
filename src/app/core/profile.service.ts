import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { tap, type Observable } from 'rxjs';
import { SessionStore, type Language, type PublicUser } from './session.store';

/** The signed-in user's editable details. At least one field must be given. */
export interface ProfilePatch {
  name?: string;
  language?: Language;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionStore);

  /** Saves the change, then updates the signed-in user so every screen shows the saved values. */
  update(patch: ProfilePatch): Observable<PublicUser> {
    return this.http.patch<PublicUser>('/users/me', patch).pipe(
      tap((user) => {
        this.session.updateUser(user);
      }),
    );
  }
}
