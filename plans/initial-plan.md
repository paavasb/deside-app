## Assessment

This is a 2020-era React 16 + Redux + Webpack 3 SPA with Firebase Realtime Database and Google sign-in. It still produces a production build, but it is not deploy-ready or safely functional:

- No Firebase Hosting config, project aliases, database rules, indexes, emulators, CI, or deployment workflow.
- The Express server is only a Heroku static-file server and can be retired.
- The entire question set and user directory are downloaded to the browser; “private” questions are merely hidden client-side, so they are not private.
- Voting uses non-atomic client updates, enabling lost concurrent votes and circumventable one-vote enforcement.
- Client code creates profiles, edits relationships, and controls authorization without deployed rules.
- Tests: 5/7 suites currently fail; Firebase initialization is unmocked/unconfigured, one suite is empty, and a snapshot is stale.
- Modernization should be a deliberate rebuild, not dependency-by-dependency upgrades.

The existing product surface is clear: Google login, question creation, public/anonymous/follower-visible questions, voting/results, tags/filtering, profiles, follows, and question management.

## Recommended target architecture

```text
React + TypeScript (Vite SPA)
        │
Firebase Hosting ── SPA rewrite, CDN, previews
        │
Firebase Auth ─── Google sign-in
        │
Cloud Functions v2 (Node + TypeScript)
  create question · cast vote · follow · moderation
        │
Cloud Firestore ─ profiles · questions · votes · follows
        │
Rules + App Check + Emulator Suite
```

Use classic Firebase Hosting for this Vite SPA; Firebase’s current Hosting setup supports SPA rewrites, preview channels, CDN delivery, and custom domains. Firebase App Hosting is worth considering only if we intentionally move to SSR/full-stack Next.js later. [Firebase Hosting quickstart](https://firebase.google.com/docs/hosting/quickstart) [Hosting configuration](https://firebase.google.com/docs/hosting/full-config)

## Modernization plan

1. Establish product and data decisions

   Define the v1 relaunch scope before rebuilding:
   - Keep: auth, public polls, anonymous authorship, one vote per account, results, profiles, own-question management.
   - Decide whether follows and follower-only polls ship in v1 or phase 2.
   - Specify “private”: followers-only, invite-only, unlisted-link, or author-only. These have very different security/data designs.
   - Establish content/reporting, account deletion, retention, and moderation requirements.

2. Audit and preserve the existing Firebase project

   Before changing production:
   - Identify the Firebase project(s), Authentication providers, Realtime Database rules, domains, and actual data volume.
   - Export/back up Realtime Database and record an immutable pre-migration snapshot.
   - Inventory malformed/duplicate legacy data: follower links, usernames, question references, and vote records.
   - Create separate Firebase projects/aliases for development, staging, and production; never test migrations against production.

3. Create a clean TypeScript application foundation

   Replace the legacy client rather than incrementally updating it:
   - Vite + current React + TypeScript in strict mode.
   - Current React Router, React Hook Form + Zod validation, and a focused server-state layer such as TanStack Query.
   - Retain plain component state where sufficient; remove the mixed Redux/context/reducer model.
   - Replace Moment, UUID v3, Enzyme, Webpack/Babel 6, legacy Sass build tooling, and unused Bootstrap/Semantic UI/react-dates dependencies.
   - Add ESLint, Prettier, type checking, Vitest + React Testing Library, and Playwright for critical browser flows.
   - Reuse the visual identity/assets initially, but make layout responsive, keyboard-accessible, and screen-reader friendly.

4. Move to a secure Firestore model

   Firestore fits this app better than the current global Realtime Database reads. Suggested shape:

   ```text
   profiles/{uid}
     handle, displayName, photoURL, createdAt, stats

   handles/{normalizedHandle}
     uid

   questions/{questionId}
     authorId, title, optionIds/options, tags, visibility,
     anonymous, createdAt, updatedAt, totalVotes, status

   questions/{questionId}/votes/{uid}
     optionId, createdAt

   profiles/{uid}/following/{targetUid}
     createdAt
   ```

   Key design constraints:
   - Client code never writes vote totals or another user’s social graph.
   - A callable Cloud Function casts a vote in a transaction: verify auth, reject duplicate votes, write the voter record, and increment exactly one option counter.
   - A callable function claims normalized handles atomically.
   - Functions own multi-document writes such as question creation/deletion and follow/unfollow consistency.
   - Firestore transactions provide atomic all-or-nothing updates and retry on concurrent changes. [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions)

5. Design privacy and authorization before implementing feeds

   This is the biggest correctness change.

   - Public questions can be queried directly from Firestore with fixed query limits and indexes.
   - Do not put follower-only/invite-only questions in a client-readable collection and then hide them in React.
   - For personalized/private feeds, use a callable function or carefully designed per-user feed fan-out that validates access server-side.
   - Add Firestore rules that default-deny, validate immutable author IDs and document fields, and permit only narrowly scoped reads/writes.
   - Test every rule through the Emulator Suite; Firestore rules are not filters, so queries must themselves be compatible with access constraints. [Secure Firestore queries](https://firebase.google.com/docs/firestore/security/rules-query) [Rules testing guidance](https://firebase.google.com/docs/firestore/security/insecure-rules)

6. Build the relaunch in thin vertical slices

   Recommended order:

   1. App shell, Firebase Auth session handling, profile bootstrap, sign-out.
   2. Public question feed with cursor pagination, search/filter UI, and loading/error/empty states.
   3. Create question with server validation and rate limits.
   4. Cast-vote function, result display, optimistic UI with rollback, duplicate-vote handling.
   5. My questions: edit permitted metadata, change visibility, delete/archive.
   6. Profile handles and public author profile.
   7. Follow graph and follower-only visibility, if retained.
   8. Reporting/moderation, abuse controls, analytics, and release polish.

7. Migrate data safely

   Implement a one-time, versioned Admin SDK migration script:
   - Map `all-questions`, user profiles, answers, and relationships to the new documents.
   - Preserve legacy IDs in a `legacyId` field for traceability.
   - Normalize handles/tags, deduplicate relationships, and generate a migration report.
   - Recompute vote totals from vote records where possible; flag data that cannot safely be inferred.
   - Dry-run against an emulator/staging project, validate counts and sampled records, then run production migration during a short read-only window.
   - Keep the old database read-only until post-launch validation is complete.

8. Add Firebase delivery and operational controls

   Commit:
   - `firebase.json`, `.firebaserc`, Firestore rules/indexes, functions source, and emulator configuration.
   - Hosting SPA rewrite to `/index.html`, cache headers for hashed assets, and a custom 404.
   - Build/deploy scripts with reproducible lockfile installs.
   - GitHub Actions: typecheck, unit tests, emulator/rules tests, Playwright smoke test, Hosting preview per PR, gated production deploy.
   - Budget alerts, Cloud Logging/Error Reporting, and a rollback runbook.
   - Firebase App Check for Auth-adjacent backend protection and abuse resistance; it complements Auth and security rules. [Firebase App Check](https://firebase.google.com/products/app-check)

## Definition of done

A relaunch should not be considered complete until:

- A new user can sign in, create a valid poll, vote once, see reliable results, and manage their own poll.
- Unauthorized writes, duplicate votes, private-question reads, and invalid payloads are rejected by automated rules/function tests.
- Production uses no Firebase secrets in the browser bundle; Firebase web configuration is fine to expose, but Admin credentials remain server-only.
- Staging and production deploys are reproducible with Hosting preview verification.
- Migration reconciliation confirms expected profile/question/vote totals.
- The deployed SPA is tested on mobile and current Chromium/Safari/Firefox.

## Decisions I need from you

1. Should this preserve the legacy Firebase data/users, or may the relaunch start with a clean database?
2. What should “private” mean: followers-only (legacy behavior), invite-only, unlisted link, or remove it for v1?
3. Should anonymous polls hide the author only in the UI, or must the author be inaccessible even to other clients/queries? My recommendation: enforce it server-side and retain author identity only for ownership/moderation.