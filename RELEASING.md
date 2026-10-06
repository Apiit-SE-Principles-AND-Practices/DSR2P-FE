# Releasing

Releases are automated by [release-please](https://github.com/googleapis/release-please).
Nobody edits the version or changelog by hand.

## How a release happens

1. Work merges into `main` as usual.
2. On every push to `main`, the **Release** workflow opens (or updates) a pull request titled
   `chore(main): release X.Y.Z`. It contains the version bump in `package.json` and the new
   `CHANGELOG.md` entries.
3. When you are ready to ship, review and **merge that PR**.
4. The workflow then creates the tag `vX.Y.Z` and a GitHub Release with the notes, runs the type
   check, unit tests and the production build, and attaches two files to the release:
   - `dsr2p-fe-vX.Y.Z.zip` — the built site (`index.html` at the zip root)
   - `dsr2p-fe-vX.Y.Z.zip.sha256` — its checksum

Nothing is deployed yet. A deployment stage will take this same zip, so what was tested is what ships.

## Commit messages decide the version

Use a prefix on the commit (or PR) title:

| Prefix                                       | Effect (while below 1.0)       | In the changelog |
| -------------------------------------------- | ------------------------------ | ---------------- |
| `feat:`                                      | minor bump (0.1.0 → 0.2.0)     | Features         |
| `fix:`                                       | patch bump (0.1.0 → 0.1.1)     | Bug Fixes        |
| `feat!:` / `fix!:` or `BREAKING CHANGE:`     | minor bump (major once ≥ 1.0)  | Breaking changes |
| `chore:`, `docs:`, `test:`, `ci:`, `style:`  | no release by themselves       | hidden           |

Commits without a recognised prefix are ignored for the version.

## Verify a download

```bash
sha256sum -c dsr2p-fe-vX.Y.Z.zip.sha256
```

## One-time repository settings

- **Settings → Actions → General → Workflow permissions:** tick _Allow GitHub Actions to create and
  approve pull requests_ (at organisation level first, if the organisation restricts it).
- **Optional but recommended:** add a repository secret `RELEASE_PLEASE_TOKEN` (a fine-grained
  personal access token with _Contents_ and _Pull requests_ read/write on this repo). Without it the
  release PR is created with the default token, and GitHub does not start the CI checks on it: close
  and reopen the PR to run them before merging.

## Known limits

- The production build still has the placeholder API address `/api` baked in. Runtime configuration
  (one build for every environment) is the next step.
