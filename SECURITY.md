# Security

## Reporting a vulnerability

Please do not open a public issue. Use GitHub's **Security → Report a vulnerability** on this repository.

## Automated checks

| Stage      | What runs                                                                           | Blocks                                  |
| ---------- | ----------------------------------------------------------------------------------- | --------------------------------------- |
| Pre-commit | secretlint, ESLint security rules (`eslint.security.js`), Prettier on staged files  | Secrets and security-rule errors only   |
| CI         | CodeQL, Semgrep (`.semgrep.yml`), gitleaks, `npm audit`, dependency review, ESLint  | High severity findings (see exception)  |

Run the same checks locally with `npm run lint:security`.

## Handling a false positive

Suppress it on the affected line with a reason, never by disabling the rule globally:

- ESLint: `// eslint-disable-next-line <rule> -- <why this is safe>`
- Semgrep: `// nosemgrep: <rule-id> -- <why this is safe>`

A reviewer must agree with the reason in the pull request.

## Known open issue

`npm audit --omit=dev` reports high-severity advisories in `@angular/core`, `@angular/compiler` and
`@angular/router` (<= 19.2.25). Fixes exist only in newer Angular majors, so the audit step is report-only
until the planned Angular upgrade. Until then, keep user content as plain text and never bypass sanitisation
(enforced by the rules above).
