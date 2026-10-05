# DSR2P Frontend — Implementation Plan (Angular 19)

**Source:** [DSR2P-frontend-implementation.md](DSR2P-frontend-implementation.md) (41 stories, Epics 1–5 and 7–11)
**Purpose:** turn the implementation guide into an ordered, Angular-specific build plan with checkable action items. Task IDs (`3.1`, `17.4`, …) match §14 of the guide so they map 1:1 to Jira subtasks.

---

## 1. Starting point

- Bare Angular 19.2 CLI scaffold ("init angular" commit): default `AppComponent`, empty `app.routes.ts`, Karma/Jasmine.
- Not yet present: router config, i18n, state, design tokens, linting, API client, CI.
- DSR2P-3 is the first and blocking ticket; every other story depends on it.

## 2. Technology decisions (Angular mapping)

The guide's examples are framework-neutral; this is how each maps to Angular. Confirm in P0.2.

| Guide concept | Angular choice |
|---|---|
| Framework | Angular 19, standalone components, signals, TypeScript `strict: true` |
| Route guards | Functional `CanActivateFn`: `requireAuth`, `requireAdmin` |
| API client (§1.5) | `HttpClient` + interceptors: base URL, `Accept-Language`, auth, 15s timeout, error normalisation to `{ status, code, message, fieldErrors? }` |
| i18n EN/SI/TA | `@ngx-translate/core` with lazy-loaded JSON bundles (Angular built-in i18n needs one build per language, which doesn't fit a runtime switcher) |
| Shared validation (Zod) | `shared/validation` Zod schemas plus an adapter turning a schema into an Angular `ValidatorFn` |
| Stores | Signals-based `SessionStore` and `AppStore` services (no NgRx) |
| `useSearchParamsState()` | `SearchParamsService` wrapping `ActivatedRoute.queryParams`, the only code allowed to touch search params |
| `ErrorBoundary` | Custom `ErrorHandler` plus a fallback component |
| Test runner | Keep Karma/Jasmine, or switch to Jest/Vitest early (decide in P0.2; costly to change later) |
| API mocking | `HttpTestingController` (or MSW if Jest/Vitest chosen) |
| E2E / a11y | Playwright + `@axe-core/playwright`; `axe-core` in component tests |
| Admin bundle split | Lazy-loaded `/admin/**` routes via `loadChildren` |
| Lint | ESLint (`angular-eslint`), Prettier, stylelint (no hex, no raw px font sizes) |

## 3. Open questions to settle with backend (Phase 0)

Blocking early work (resolve before Phase 1–2):

1. Session mechanism: HttpOnly cookie or bearer token, and refresh strategy.
2. Password rules (one policy across form, API and DB).
3. Category names: backend `name.en/si/ta` or frontend i18n keys by slug.
4. Photo upload: same request as the review, or separate after creation; server size limit.

Resolve before the story that needs them:

5. Dietary filter semantics (AND across selected values?) — DSR2P-11.
6. Price-band labels and ranges: source endpoint — DSR2P-11/12/13.
7. Do admin responses need moderation? — DSR2P-20.
8. Reported content: stays visible or hidden pending review? — DSR2P-46/32.
9. Can Admins write reviews? Can an Admin self-delete? — DSR2P-17/44.
10. Text limits in code points or bytes? — DSR2P-17/19/27.
11. `ON DELETE` behaviour for `reviews.item_id` — DSR2P-30.
12. Final endpoint paths and payloads vs DSR2P-42 — all.

## 4. Phase plan

Each phase lists its stories, the main deliverables and the exit criteria. Tick items as they are merged. A story is done only when all its tasks are ticked and it meets the Definition of Done (§6).

### Phase 0 — Pre-build agreements

- [ ] **P0.1** Hold one frontend/backend session on the 12 open questions in §3; record decisions.
- [ ] **P0.2** Confirm framework, test runner and validation library; update the technology table above.
- [ ] **P0.3** Agree the API contract for Phase 1–2 endpoints (`/auth/*`, `/me`, `/categories`, `/restaurants`).
- [ ] **P0.4** Add the task IDs below as Jira subtasks under their stories.

**Exit:** blocking questions 1–4 answered and written down.

### Phase 1 — Foundations (DSR2P-3, 28, 26)

**DSR2P-3 — Scaffold & design tokens**
- [-] **3.1** TypeScript strict, ESLint, Prettier, stylelint and test runner configured in the first commit.
- [-] **3.2** `tokens.css` (colour, type, spacing, radius, shadow) and typed `tokens.ts` for breakpoints.
- [-] **3.3** stylelint rule blocking hard-coded hex values and raw px font sizes.
- [-] **3.4** `AppShell` with the single 640px breakpoint decision (`matchMedia` + CSS for first paint) and skip-to-content link.
- [-] **3.5** `TopNav` and `BottomTabBar` (`aria-current="page"` on the active tab).
- [-] **3.6** Primitives: `NotFound`, error fallback, `Spinner`/`Skeleton`, `Toast`, `InlineError`.
- [-] **3.7** Environment config (`API_BASE_URL`) and the `HttpClient` interceptor skeleton.
- [-] **3.8** Dev-only `/dev/tokens` page (colour pairs, type scale, EN/SI/TA samples), excluded from production builds.
- [-] **3.9** WCAG contrast script; CI fails below 4.5:1 for body text.
- [-] **3.10** Tests: nav swap at 639px/640px; contrast script unit tests.

**DSR2P-28 — Sinhala/Tamil font fallback**
- [ ] **28.1** Self-host Noto Sans Sinhala and Noto Sans Tamil as WOFF2.
- [ ] **28.2** `@font-face` with `unicode-range` and `font-display: swap`; preload only the Latin face.
- [ ] **28.3** Body line-height token ≥ 1.5; no fixed heights on text containers.
- [ ] **28.4** Verify on an Android device without SI/TA system fonts and on Windows; save screenshots.

**DSR2P-26 — Language switcher**
- [ ] **26.1** `en.json`, `si.json`, `ta.json`; lazy-loaded bundles with EN fallback for missing keys.
- [ ] **26.2** Update `<html lang>` on every language change.
- [ ] **26.3** `LanguageSwitcher`: three buttons in their own scripts, `aria-current="true"` on the selected one.
- [ ] **26.4** Persist the Guest choice locally (signed-in path added in 6.3).
- [ ] **26.5** Tests: three render, `aria-current` moves, strings swap, form input survives a switch.

**DSR2P-43 groundwork (do now, not later)**
- [-] **43.1** Runner, Testing Library (or Angular TestBed helpers), API mocking and Playwright set up.
- [-] **43.2** CI runs lint, type-check, tests and the contrast check on every PR; merge blocked on failure.

**Exit:** app shell runs, nav swaps at 640px, SI/TA render without tofu, CI green.

### Phase 2 — Authentication (DSR2P-5, 4, 7)

**DSR2P-5 — Login**
- [ ] **5.1** `SessionStore` (`user`, `role`, `isAuthenticated`, `login()`, `logout()`) using the P0.1 mechanism.
- [ ] **5.2** Rehydrate via `GET /me` in an app initialiser, with a neutral loading shell.
- [ ] **5.3** `LoginForm`: generic "Email or password is incorrect", password cleared on failure.
- [ ] **5.4** Role redirect (Admin → `/admin`, Customer → `/`) honouring `returnTo`.
- [ ] **5.5** Open-redirect guard for `returnTo`; `429` handling.
- [ ] **5.6** Tests: BB03, BB04, Admin redirect, external `returnTo` ignored, reload keeps session.

**DSR2P-4 — Registration**
- [ ] **4.1** `registerSchema` in `shared/validation`.
- [ ] **4.2** `RegisterForm`: name, email, password, confirm, preferred-language radio group.
- [ ] **4.3** `PasswordRules` live hints (`aria-describedby`) and show/hide toggle (`aria-pressed`).
- [ ] **4.4** Map `409` to Email and `fieldErrors` onto fields; keep values except password.
- [ ] **4.5** On success: store session, set UI language, redirect.
- [ ] **4.6** Tests: BB01, BB02, weak password, success.

**DSR2P-7 — Action gating**
- [ ] **7.1** `requireAuth` and `requireAdmin` guards applied to the route map.
- [ ] **7.2** `LoginPrompt` dialog (focus trap, Esc, focus return) and `useRequireLogin` equivalent service.
- [ ] **7.3** Global `401/403/404/409/5xx` handling in the interceptor (§1.6 of the guide).
- [ ] **7.4** Tests: Guest Like → prompt with no request; Customer on `/admin` redirected; 403 and 401 handled.

**Exit:** a user can register, log in, reload and stay logged in; guards and error handling work.

### Phase 3 — Browse & search (DSR2P-9, 8, 10, 13, 11, 12)

- [ ] **S.1** `SearchParamsService` as the single owner of search URL params.

**DSR2P-9 — City selector**
- [ ] **9.1** `CitySelector` left of search in `TopNav` and the mobile header.
- [ ] **9.2** Store city in `AppStore`, persist locally, default Colombo, mirror to `city` param on `/search`.
- [ ] **9.3** Interceptor injects `city` into restaurant and category requests.
- [ ] **9.4** Tests: one refetch on change, persistence, position at 375px and 1024px.

**DSR2P-8 — Categories on Home**
- [ ] **8.1** `GET /categories` with session caching.
- [ ] **8.2** `CategoryTile` (single link) and `CategoryGrid` (3 → 6 columns at 640px).
- [ ] **8.3** Skeleton and error-with-Retry states.
- [ ] **8.4** Tests: column counts; navigation carries category and city.

**DSR2P-10 — Keyword search**
- [ ] **10.1** `SearchInput` submit goes to `/search?q=…`, keeping city and filters.
- [ ] **10.2** `SearchResultsPage` with 300ms debounce and `switchMap` cancellation of stale requests.
- [ ] **10.3** Pagination, delayed skeleton (~150ms), `EmptyState` naming the query, error with Retry.
- [ ] **10.4** Result count announced in an `aria-live` region.
- [ ] **10.5** Tests: BB05, debounce, stale response discarded, empty state.

**DSR2P-13 — Result cards**
- [ ] **13.1** Shared `RatingDisplay` (stars + numeral + count; "No ratings yet" when unrated).
- [ ] **13.2** Shared `PriceBand` with accessible label.
- [ ] **13.3** `RestaurantCard` (single link, lazy image with fixed aspect ratio, placeholder, two-line truncation), mobile and ≥640px layouts.
- [ ] **13.4** Tests: BB07 navigation, numeral always shown, unrated label.

**DSR2P-11 — Filters**
- [ ] **11.1** `FilterBar`: category, dietary chips (`aria-pressed`), spice, price band, Clear all.
- [ ] **11.2** Mobile "Filters (n)" bottom sheet with Apply.
- [ ] **11.3** Price-band options loaded from the backend.
- [ ] **11.4** Reset `page` on filter change; empty state with Clear filters.
- [ ] **11.5** Tests: BB06, dietary combination, Clear all, mobile Apply.

**DSR2P-12 — Sort**
- [ ] **12.1** `SortSelect` (Top rated default, Price ↑, Price ↓) bound to `sort`.
- [ ] **12.2** Fall back to default on unknown values; unrated restaurants last.
- [ ] **12.3** Tests: URL and request update; label persists after reload.

**Exit:** a Guest can pick a city, browse categories, search, filter, sort and open a result.

### Phase 4 — Restaurant Detail (DSR2P-14, 15, 16, 22, 45)

**DSR2P-14 — Detail & rating breakdown**
- [ ] **14.1** Detail layout with independently loading sections (two columns ≥1024px, stacked with anchors below).
- [ ] **14.2** `RestaurantHeader` with "Write a review" action; `<title>` set to the restaurant name.
- [ ] **14.3** `RatingBreakdown` with three `RatingBar` meters and numerals; zero-review state.
- [ ] **14.4** Tests: three bars, zero-count state, 404 view.

**DSR2P-15 — Menu listing**
- [ ] **15.1** `MenuSection`, `MenuCategoryHeader` (`<h3>` overline), `MenuItemRow` with name and price on one line.
- [ ] **15.2** `DietaryTag` and `SpiceLevel` with text labels.
- [ ] **15.3** No caching for the menu request; refetch on window refocus.
- [ ] **15.4** LKR formatting with `Intl.NumberFormat`; empty-menu state.
- [ ] **15.5** Tests: BB08 grouping, same-line layout at 375px, refocus refetch.

**DSR2P-16 — Reviews on Detail**
- [ ] **16.1** `ReviewsSection` with count, `ReviewSortSelect` (`reviewSort` param), Load more.
- [ ] **16.2** `ReviewCard` as `<article>`, `lang` from the review language, plain-text rendering.
- [ ] **16.3** `ReviewPhoto` with alt text and enlarge dialog.
- [ ] **16.4** `RestaurantResponse` (nested, one per review) and collapsible `CommentThread`.
- [ ] **16.5** Empty state with "Write a review" call to action.
- [ ] **16.6** Tests: US-76–79 sorting, response placement, photo alt, like count beside rating, no status badge.

**DSR2P-22 — Like**
- [ ] **22.1** `LikeButton` with `aria-pressed` and count in the accessible name.
- [ ] **22.2** Optimistic toggle with rollback, in-flight disable, reconcile to server response.
- [ ] **22.3** Tests: like, unlike, rollback, Guest prompt.

**DSR2P-45 — Unverified-reviews disclaimer**
- [ ] **45.1** `ReviewDisclaimer` under the Reviews heading, non-dismissible, in all three languages.
- [ ] **45.2** Tests: renders in EN/SI/TA and with zero reviews.

**Exit:** a full public Detail page with menu, ratings and reviews.

### Phase 5 — Submitting content (DSR2P-17, 38, 21, 19, 18, 6, 27)

**DSR2P-17 — Submit a review**
- [ ] **17.1** `ratingSchema` and `reviewSchema`.
- [ ] **17.2** `StarRatingInput` as a five-option radio group in a `<fieldset>`.
- [ ] **17.3** `ReviewForm`: three ratings, optional dish select, text with counter, Submit disabled until valid.
- [ ] **17.4** `sessionStorage` draft autosave/restore keyed by restaurant.
- [ ] **17.5** Pending-moderation confirmation; no optimistic insert into the public list.
- [ ] **17.6** Failure handling: error summary with focus, field errors, Retry, values kept.
- [ ] **17.7** Tests: BB10, disabled Submit, 0/6 rejected, Guest prompt, 500 keeps content, draft restore.

**DSR2P-38 — Resilient error handling**
- [ ] **38.1** `OfflineBanner` driven by `navigator.onLine` and `GET /health`.
- [ ] **38.2** Draft persistence for reply and admin restaurant forms, with "Restored your unsent draft" notice and Discard.
- [ ] **38.3** Save draft before a `401` redirect; restore after login.
- [ ] **38.4** Review all error messages: what happened and what to do next.
- [ ] **38.5** Tests: 500, timeout, offline, 401 round-trip, error fallback.

**DSR2P-21 — Photo on a review**
- [ ] **21.1** `PhotoPicker`: type/size validation before processing, preview, Remove, alt-text field.
- [ ] **21.2** Resize/compress helper (≤1600px long edge, ~0.8 quality, EXIF stripped, ≤500 KB target).
- [ ] **21.3** Required image-rights checkbox gating Submit.
- [ ] **21.4** Agreed upload strategy, including "saved without photo — retry photo".
- [ ] **21.5** Tests: BB11, oversized/wrong type rejected with no request, rights gate, output dimensions.

**DSR2P-19 — Reply**
- [ ] **19.1** `replySchema`; inline `ReplyComposer` (one open at a time, focus management).
- [ ] **19.2** Persist reply drafts; pending note without adding the reply to the thread.
- [ ] **19.3** Tests: BB13, Guest prompt, empty reply blocked.

**DSR2P-18 — My reviews & replies**
- [ ] **18.1** `/account/reviews` with Reviews | Replies tabs and status filter.
- [ ] **18.2** `AccountReviewRow` and `StatusBadge` (icon + text); rejection reason under rejected rows.
- [ ] **18.3** Per-tab empty states; "No reason recorded" fallback.
- [ ] **18.4** Tests: three badges, reason shown, filter request.

**DSR2P-6 — Profile & language**
- [ ] **6.1** `/account` with `ProfileForm`, read-only email, links to My reviews and My data.
- [ ] **6.2** `PATCH /me`; Save enabled only when dirty; success toast; failure handling.
- [ ] **6.3** Connect `LanguageSwitcher` to `PATCH /me` for signed-in users (one shared source).
- [ ] **6.4** Tests: language applied and persisted after reload; name validation.

**DSR2P-27 — Multi-script entry**
- [ ] **27.1** `ContentLanguageSelect` on review, reply, menu item and restaurant description fields.
- [ ] **27.2** Optional script detection (SI U+0D80–0DFF, TA U+0B80–0BFF) to pre-select language.
- [ ] **27.3** NFC normalisation on submit; grapheme-aware counters (`Intl.Segmenter`).
- [ ] **27.4** Tests: SI/TA round-trip, language tag sent, normalisation, grapheme counting.

**Exit:** a Customer can submit, track and reply to content with nothing lost on failure.

### Phase 6 — Admin catalogue (DSR2P-29, 30, 31)

- [ ] **A.1** Shared `AdminTable` (semantic table ≥640px, stacked labelled cards below).

**DSR2P-29 — Restaurants**
- [ ] **29.1** `RestaurantListPage` with search and city filter.
- [ ] **29.2** `RestaurantForm` with repeatable `MenuItemFieldset`, submitted in one request.
- [ ] **29.3** Map nested server errors (e.g. `menuItems[2].priceLkr`).
- [ ] **29.4** `ConfirmDeleteDialog` with cascade counts and typed name.
- [ ] **29.5** Unsaved-changes guard (`CanDeactivateFn`).
- [ ] **29.6** Tests: BB17, delete confirmation, unsaved-changes guard.

**DSR2P-30 — Menu items**
- [ ] **30.1** `menuItemSchema` (price ≥ 0, max 2 decimals).
- [ ] **30.2** `MenuItemsPanel` and `MenuItemForm` with dietary checkboxes and spice select.
- [ ] **30.3** Update rows from the server response; warn when deleting an item linked to reviews.
- [ ] **30.4** Tests: BB18, −1 rejected, 0 accepted, dietary enum values.

**DSR2P-31 — Images & content**
- [ ] **31.1** `ImageField`: upload (default, reuses 21.2) and https URL with load check.
- [ ] **31.2** `ContentEditor` (plain textarea with counter).
- [ ] **31.3** `POST /admin/uploads` integrated with restaurant and menu-item saves.
- [ ] **31.4** Tests: BB19, invalid URL, non-image file.

**Exit:** an Admin can fully manage restaurants, menus and images without a developer.

### Phase 7 — Moderation & dashboard (DSR2P-35, 32, 33, 34, 20, 47, 46)

**DSR2P-35 — Dashboard**
- [ ] **35.1** `AdminStatTile` and `/admin` grid (2 → 4 columns at 640px).
- [ ] **35.2** Attention style plus "Review now →" link when pending > 0.
- [ ] **35.3** Tests: column counts, flag only when > 0, link filters.

**DSR2P-32 — Moderation queue**
- [ ] **32.1** `ModerationQueuePage`: type filter, oldest-first, count heading.
- [ ] **32.2** `ModerationItem` with type badge, context, parent review excerpt for replies.
- [ ] **32.3** Remove items only after server success; busy state; keep item on failure.
- [ ] **32.4** Refetch every 60s and on focus; handle `409` "already moderated".
- [ ] **32.5** Move focus to the next item after removal.
- [ ] **32.6** Tests: BB14/BB15 non-optimistic removal, failure kept, 409 handled.

**DSR2P-33 — Approve/reject review**
- [ ] **33.1** `rejectionReasonSchema` and shared preset-reason list.
- [ ] **33.2** `RejectDialog` with presets and required reason; Approve with busy state.
- [ ] **33.3** Tests: BB14 approve body, BB15 empty reason blocked, reason sent.

**DSR2P-34 — Approve/reject comment**
- [ ] **34.1** Parameterise `ModerationItem` and `RejectDialog` by type; wire comments endpoint.
- [ ] **34.2** Run the DSR2P-33 tests for replies.

**DSR2P-20 — Restaurant response**
- [ ] **20.1** Admin-only `ResponseComposer` on reviews without a response.
- [ ] **20.2** Handle `409`: show message and refresh the review.
- [ ] **20.3** Tests: BB20 hidden when a response exists, 409, non-Admin never sees it.

**DSR2P-47 — Moderation guidelines**
- [ ] **47.1** Team guideline text as `content/moderation-guidelines.md`, rendered at `/moderation-guidelines`.
- [ ] **47.2** Link from the queue header and `RejectDialog`.
- [ ] **47.3** Align preset rejection reasons with guideline categories from one shared list.
- [ ] **47.4** Tests: links present, content renders, presets match categories.

**DSR2P-46 — Report content**
- [ ] **46.1** `ReportButton` (hidden on own content, Guest prompt) and `ReportDialog`.
- [ ] **46.2** Button becomes disabled "Reported" after submission; handle `409`.
- [ ] **46.3** "Reported" badge and first-in-order sorting in the queue, per the P0.1 decision.
- [ ] **46.4** Tests: Guest prompt, submit, Other requires details, disabled after report, queue badge and order.

**Exit:** the full moderation loop works end to end.

### Phase 8 — Compliance (DSR2P-44)

- [ ] **44.1** `/privacy` page: what is collected, why, retention, export/delete routes.
- [ ] **44.2** `/account/data` with `DataExportCard` (JSON download).
- [ ] **44.3** `DeleteAccountCard`: typed confirmation and password; clear session, drafts and local preferences on success.
- [ ] **44.4** Apply the agreed rule for Admin self-deletion.
- [ ] **44.5** Review the registration form for data minimisation; record a justification per field.
- [ ] **44.6** Tests: export download, delete confirmation, local data cleared.

### Phase 9 — Hardening & QA (DSR2P-36, 37, 40, 41, 39, 43)

**DSR2P-36 — Validation parity**
- [ ] **36.1** All schemas in `shared/validation`, connected to every form.
- [ ] **36.2** Share the module with the backend, or add a CI hash check against the backend copy.
- [ ] **36.3** Table-driven schema tests (ratings 0/1/5/6/3.5/null/"4"; email and password cases).

**DSR2P-37 — Search performance**
- [ ] **37.1** `performance.mark`/`measure` around search; log durations.
- [ ] **37.2** Lazy-loaded admin bundle and a CI bundle-size budget (e.g. ≤200 KB gzipped initial).
- [ ] **37.3** Confirm summary-only card payloads and server-resized thumbnails with backend.
- [ ] **37.4** Lighthouse on `/search` (mobile, throttled) and a timed integration test; record results.

**DSR2P-40 — Responsive QA**
- [ ] **40.1** Route × width × browser QA matrix with screenshots.
- [ ] **40.2** Playwright viewport tests (one nav visible, no horizontal overflow) at 375/640/1024.
- [ ] **40.3** Fix and retest every failure.

**DSR2P-41 — Accessibility QA**
- [ ] **41.1** `@axe-core/playwright` over every route; fix serious/critical issues.
- [ ] **41.2** Keyboard-only pass per route.
- [ ] **41.3** Screen-reader pass (NVDA or VoiceOver) on the four usability tasks.
- [ ] **41.4** 44×44px hit-area Playwright check.
- [ ] **41.5** Audit badges, ratings, tags and images for text equivalents and alt text.
- [ ] **41.6** Findings table: issue / WCAG criterion / severity / fix / retest.

**DSR2P-39 — Usability testing**
- [ ] **39.1** Four-task test script and results template.
- [ ] **39.2** Recruit 10 first-time participants; prepare test accounts.
- [ ] **39.3** Run sessions (think-aloud, 2-minute stuck rule); record results.
- [ ] **39.4** Fix issues that blocked two or more participants; retest.
- [ ] **39.5** Check against the 90% and 85% targets; file the evidence.

**DSR2P-43 — Automated testing (finish)**
- [ ] **43.3** Confirm required suites exist: `ReviewForm`, `FilterBar`, `AppShell` nav swap.
- [ ] **43.4** Script that builds the BB01–BB20 / US-76–79 coverage table from test titles and flags gaps.
- [ ] **43.5** Fill coverage gaps before the demonstration.

### Phase 10 — Release readiness

- [ ] **R.1** Every endpoint used matches the final DSR2P-42 documentation.
- [ ] **R.2** EN/SI/TA translation files have no missing keys.
- [ ] **R.3** Run the Definition of Done (§6) against every story.
- [ ] **R.4** Move completed stories to Done in Jira with the peer reviewer recorded.

## 5. Dependency order

`3 → 28 → 26 → 5 → 4 → 7 → 9 → 8 → 10 → 13 → 11 → 12 → 14 → 15 → 16 → 22 → 45 → 17 → 38 → 21 → 19 → 18 → 6 → 27 → 29 → 30 → 31 → 35 → 32 → 33 → 34 → 20 → 47 → 46 → 44 → 36 → 37 → 40 → 41 → 39`

DSR2P-43 runs alongside every ticket.

## 6. Definition of Done (every story)

- [ ] All Jira acceptance criteria demonstrably met.
- [ ] Works at 375px, 640px and 1024px+ in desktop and mobile browsers.
- [ ] No hard-coded strings or token values; EN/SI/TA strings present.
- [ ] Loading, empty and error states implemented — no blank screens.
- [ ] Ticket's tests written and passing in CI.
- [ ] axe-core reports no serious/critical violations on touched screens.
- [ ] Peer-reviewed by the other team member (no self-approval).

## 7. Risks

| Risk | Mitigation |
|---|---|
| Backend contract changes after build | Agree Phase 1–2 contracts in P0.3; isolate endpoints in typed API service files; confirm against DSR2P-42 in R.1 |
| Test runner switch late in the project | Decide in P0.2, before DSR2P-3 |
| SI/TA rendering gaps on real devices | Self-hosted fonts (28.1) and a real-device check (28.4) in Phase 1 |
| Two-person team: review bottleneck | Small PRs per task ID; keep CI fast |
| Usability target needs 10 participants | Recruit during Phase 7–8 so sessions can start once Epics 3–5 are done |
| Validation drift between form, API and DB | Single `shared/validation` module plus CI hash check (36.2) |
