# DeSide

Ask a question, let the internet deside. Public and follower-only polls with anonymous
authorship, one vote per account, tags, follows and a DeSide Score.

React 19 + TypeScript (Vite) · Firebase Hosting · Firebase Auth · Cloud Firestore ·
Cloud Functions v2

> **This is a v2 rebuild.** The v1 app (React 16 + Redux + Webpack 3 + Realtime
> Database, served by an Express static server on Heroku) has been replaced. See
> [What changed from v1](#what-changed-from-v1).

---

## Manual steps you have to do

Everything else is implemented and committed. These five need you, because they need
credentials, a billing account, or a Google Cloud console:

### 1. Install a JDK 21 or newer — **required to run any emulator locally**

The Firestore and Auth emulators run on the JVM, and current `firebase-tools`
refuses anything below Java 21. This machine has only Java 12 and Java 8, and its
Homebrew install is broken on this macOS version, so I could not install one for you.

```bash
java -version   # must report 21 or higher
```

Install [Temurin 21](https://adoptium.net/temurin/releases/?version=21) (or
`brew install openjdk@21` once Homebrew is working again).

Until this is done, `npm run test:rules`, `npm run test:functions`, `npm run test:e2e`,
`npm run dev` and `npm run seed` cannot run on this machine. **CI already provisions
Java 21, so all of these run there.** Everything that does not need the JVM —
typecheck, lint, unit tests, both builds — runs locally today and passes.

### 2. Create the Firebase projects and fill in `.firebaserc`

Create three projects (`dev`, `staging`, `prod`) at
<https://console.firebase.google.com>, then replace the placeholders:

`.firebaserc`:

```json
{
  "projects": {
    "default": "deside-dev-xxxx",
    "dev": "deside-dev-xxxx",
    "staging": "deside-staging-xxxx",
    "prod": "deside-prod-xxxx"
  }
}
```

For each project:

- **Authentication → Sign-in method →** enable **Google**.
- **Authentication → Settings → Authorized domains →** add your Hosting domains.
- **Firestore Database →** create the database (production mode; the committed rules
  replace the defaults on first deploy).
- Cloud Functions v2 requires the **Blaze** plan.

Never test a migration or a rules change against production — that is what the
separate projects are for.

### 3. Fill in the web config

```bash
cp app/.env.example app/.env.local
```

Paste the values from **Project settings → General → Your apps → SDK setup and
configuration**. This config is public by design; it names the project and authorizes
nothing. Do not put a service-account key in it.

### 4. Set up GitHub Actions secrets and variables

For `.github/workflows/deploy.yml`:

| Kind     | Name                                                                    |
| -------- | ----------------------------------------------------------------------- |
| Secret   | `FIREBASE_SERVICE_ACCOUNT_STAGING`, `FIREBASE_SERVICE_ACCOUNT_PROD`     |
| Variable | `STAGING_FIREBASE_*`, `PROD_FIREBASE_*` (one per `VITE_FIREBASE_*` key) |
| Variable | `STAGING_RECAPTCHA_SITE_KEY`, `PROD_RECAPTCHA_SITE_KEY` (optional)      |

Generate each service account with
`firebase init hosting:github`, or from **Project settings → Service accounts**.
Then create GitHub Environments named `staging` and `production`, and add a required
reviewer to `production` so a prod deploy is never one accidental click.

### 5. Enable App Check (recommended, not required)

1. Register the web app with **reCAPTCHA Enterprise** in the Firebase console.
2. Put the site key in `VITE_RECAPTCHA_SITE_KEY`.
3. Once real traffic is passing App Check, enforce it on the backend:
   ```bash
   firebase functions:config:set  # not used; set the env var on the functions instead
   firebase deploy --only functions   # with APP_CHECK_ENFORCE=true in the environment
   ```
   The functions read `APP_CHECK_ENFORCE`; it defaults to off so the backend keeps
   working before App Check exists. See [`docs/RUNBOOK.md`](docs/RUNBOOK.md).

Also worth doing once billing is live: **budget alerts** and **Error Reporting**
(both in the runbook).

---

## Getting started

```bash
npm run bootstrap        # installs root, app/ and functions/ dependencies
npm run dev:emulators    # terminal 1 — needs JDK 21+
npm run seed             # terminal 2 — sample accounts, questions, votes, follows
npm run dev:app          # terminal 3 — Vite on http://127.0.0.1:5173
```

`app/.env.local` needs `VITE_USE_EMULATORS=true` for the emulator workflow.

Sign in with the Auth emulator's Google stand-in — it opens a popup where you can
auto-generate a test account.

## Commands

| Command                  | What it does                                               |
| ------------------------ | ---------------------------------------------------------- |
| `npm run bootstrap`      | Install all three package trees                            |
| `npm run dev:emulators`  | Auth, Firestore, Functions, Hosting + UI, with data import |
| `npm run dev:app`        | Vite dev server                                            |
| `npm run seed`           | Seed the emulator with sample data                         |
| `npm run typecheck`      | TypeScript across app, functions and tests                 |
| `npm run lint`           | ESLint across app and functions                            |
| `npm run format`         | Prettier write (`format:check` to verify)                  |
| `npm run test:unit`      | Vitest unit + component tests (no emulator needed)         |
| `npm run test:rules`     | Security rules tests against the Firestore emulator        |
| `npm run test:functions` | Callable function tests against the emulator suite         |
| `npm run test:e2e`       | Playwright browser tests against the emulator suite        |
| `npm run test`           | unit + rules + functions                                   |
| `npm run build`          | Build functions then the app                               |
| `npm run preview`        | Build and deploy to a 7-day Hosting preview channel        |
| `npm run deploy:staging` | Build and deploy everything to staging                     |
| `npm run deploy:prod`    | Build and deploy everything to production                  |

## Layout

```
app/                 Vite + React + TypeScript SPA (the only thing shipped to browsers)
functions/           Cloud Functions v2 — every mutation in the product
shared/              Zod schemas, limits and types imported by BOTH of the above
tests/rules/         Security rules tests
tests/functions/     Callable tests over the real callable HTTP protocol
e2e/                 Playwright critical-flow tests
scripts/seed.ts      Emulator seed data
docs/                Data model and operational runbook
firestore.rules      Default-deny rules; the privacy guarantees live here
firestore.indexes.json
firebase.json        Hosting SPA rewrite, cache headers, functions, emulator ports
```

`shared/` is deliberately not a package — both `app/` and `functions/` compile it from
source. That way the limits a form enforces are literally the limits the server
enforces, with no version to drift.

## Architecture

```
Browser (React SPA on Firebase Hosting)
   │
   ├── reads ──►  Cloud Firestore, directly, for public data only
   │              (firestore.rules grants list ONLY for
   │               visibility == 'public' && status == 'active')
   │
   └── writes ─►  Callable Cloud Functions  ──►  Firestore (Admin SDK)
                  create/update/delete question · cast vote · follow ·
                  claim handle · following feed · report
```

Two rules make the whole thing hold together:

1. **Clients never write.** Not one collection is client-writable. Vote counters, the
   follow graph, profile stats and the DeSide Score are all server-maintained, so none
   of them can be forged.
2. **Followers-only questions are never sent to a client that shouldn't have them.**
   They are not client-readable at all; the `listFollowingFeed` and `getQuestion`
   callables check the follow edge server-side before returning anything.

[`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) has the collection-by-collection detail,
including why anonymity holds and which query limitations are inherent to Firestore.

## What changed from v1

### Security and correctness fixes

| v1 behaviour                                                                                                                                                        | v2                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every browser downloaded **all** questions and the **entire** user directory. "Private" questions were filtered out in React — so they were never actually private. | Public questions are queried with a bounded, constrained query. Followers-only questions are not client-readable at all and are served only by a callable that verifies the follow edge server-side. |
| Anonymous questions still carried `creator` in the document every client downloaded.                                                                                | Anonymous questions store `authorId: null`. The author exists only in `questionAuthors/{id}`, which is denied to every client, and in the author's own owner-only index.                             |
| Voting did `read → +1 → write` from the browser. Concurrent votes silently overwrote each other, and any client could set any counter to any value.                 | `castVote` is a single Firestore transaction: it verifies access, rejects a duplicate by the existence of `votes/{uid}`, and increments exactly one counter. Covered by a concurrency test.          |
| One vote per account was enforced by a client-side check that was trivial to skip.                                                                                  | Enforced by the existence check and the write happening in the same transaction.                                                                                                                     |
| Follows were written as two independent browser calls, which is why the legacy data has one-sided follower links.                                                   | `setFollow` writes both directions and both counters in one transaction, and is idempotent.                                                                                                          |
| Profiles, usernames and relationships were created and edited by client code with no deployed rules.                                                                | All of it moves through validated callables. Handle uniqueness is atomic via `handles/{normalizedHandle}` as a document ID.                                                                          |
| No rate limiting.                                                                                                                                                   | Fixed-window per-account limits on every mutating callable.                                                                                                                                          |
| No Firebase Hosting config, rules, indexes, emulators, CI or deploy path.                                                                                           | All committed: SPA rewrite, cache headers, security headers, rules + indexes, emulator config, CI, preview channels, gated production deploy.                                                        |

### Product changes you should know about

One thing behaves differently from v1, deliberately:

- **Title search and the answered/unanswered filter apply to loaded questions only.**
  Firestore has no substring search, and answered-state is per-viewer. The UI says so
  on screen. Real full-corpus search needs an external index (Algolia/Typesense) —
  worth a follow-up if search matters.

The feed itself keeps v1's single-list behaviour: **Show → "Everything I can see"**
(the default) merges public questions with followers-only questions from the people you
follow. Because those are two separately-paginated sources — one Firestore query, one
callable — they are combined by an ordered k-way merge with lookahead
([`app/src/features/feed/merge.ts`](app/src/features/feed/merge.ts)) rather than by
concatenating a page from each, which would put newer items below older ones at every
page boundary. The callable is asked for only the followers-only half in this mode, so a
followed author's public questions can never appear twice. Two narrower views,
**Public questions only** and **From people I follow**, are also available.

Also: `sortBy: 'relevant'` was reimplemented. v1's comparator mutated a running score
across pairwise comparisons, which is not a valid comparator — results depended on
input order. v2 computes an absolute score per question, so the ordering is stable.

### Removed

The legacy `src/`, `server/` (Heroku static server), `public/`, Webpack 3, Babel 6,
Redux, Enzyme, Moment, Numeral, UUID v3, Bootstrap, Semantic UI, `react-dates`,
`react-tagsinput`, `react-search-box`, `react-switch` and `react-modal`. Date
formatting and number formatting are now `Intl`; the tag editor, switches and search
are purpose-built and accessible.

### Data

Per your decision, **v2 starts with a clean database** — there is no migration script.
Existing Google accounts still sign in and get a fresh profile with a generated handle
on first login. [`docs/RUNBOOK.md`](docs/RUNBOOK.md) has the backup procedure for the
old Realtime Database if you want a snapshot before decommissioning it.

## Accessibility and browser support

Rebuilt for keyboard and screen-reader use: a single visible focus style everywhere,
a skip link, `role="alert"` on failures, labelled controls, and radio groups instead
of v1's unlabelled toggle switches (a toggle can't tell a screen reader which side is
selected). Results are announced with text and percentages, not colour alone. The
layout is responsive, with the primary nav collapsing to a bottom bar on phones.
`prefers-reduced-motion` and `prefers-contrast` are honoured.

Playwright covers Chromium and a mobile viewport. Cross-browser verification on
current Safari and Firefox is a manual step before launch — see the runbook.

## Known gaps

- Full-text search needs an external index (see above).
- Cross-browser and real-device testing has not been done — no deployed environment
  exists yet.
- The moderation queue is written but has no admin UI; reports are readable only via
  the console or Admin SDK.
- Account deletion and data export are not implemented. Worth scoping before launch
  if you have GDPR/CCPA obligations.
