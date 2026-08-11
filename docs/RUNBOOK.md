# DeSide operational runbook

Everything here assumes `firebase login` has been run and `.firebaserc` has real
project IDs. Aliases: `dev`, `staging`, `prod`.

---

## Local development

```bash
npm run bootstrap
npm run dev:emulators   # terminal 1 (needs JDK 21+)
npm run seed            # terminal 2
npm run dev:app         # terminal 3
```

Emulator ports: Auth `9099`, Firestore `8080`, Functions `5001`, Hosting `5000`,
UI `4000`.

`dev:emulators` imports from and exports to `.emulator-data/`, so seeded state
survives a restart. Delete that directory for a clean slate.

### JDK requirement

The Firestore and Auth emulators are JVM processes and current `firebase-tools`
requires **Java 21+**. `java -version` must report 21 or higher, or every emulator
command fails with
`firebase-tools no longer supports Java version before 21`.

---

## Deploying

### Order matters

Always deploy **rules and indexes before** the app and functions. The client's feed
query depends on the composite indexes existing, and on the list rule permitting the
constrained query. Deploying the client first produces failed reads for live users.

```bash
firebase deploy --only firestore:rules,firestore:indexes --project staging
firebase deploy --only functions --project staging
firebase deploy --only hosting --project staging
```

Or the packaged path:

```bash
npm run deploy:staging
npm run deploy:prod
```

Index builds are asynchronous. A large collection can take minutes; watch
**Firestore → Indexes** until every index reads _Enabled_ before sending traffic.

### Preview channels

```bash
npm run preview                      # 7-day channel on the default project
firebase hosting:channel:list --project staging
firebase hosting:channel:delete <channel-id> --project staging
```

CI deploys a preview channel for every pull request.

### Production

Production deploys only via **Actions → Deploy → Run workflow → target: prod**, which
is gated by the `production` GitHub Environment and its required reviewer.

---

## Rollback

Hosting keeps every release, so a bad frontend is a one-click revert.

```bash
# 1. Frontend — instant
firebase hosting:releases:list --project prod
firebase hosting:rollback --project prod
```

```bash
# 2. Functions — redeploy the previous commit
git checkout <last-good-sha>
npm run build:functions
firebase deploy --only functions --project prod
```

```bash
# 3. Rules — rules are versioned in git, so redeploy the previous file
git checkout <last-good-sha> -- firestore.rules
firebase deploy --only firestore:rules --project prod
```

**Rules are the risky one.** A too-permissive rules deploy is a live data exposure, not
a broken page. Roll rules back first if a deploy is suspect, and confirm with
`npm run test:rules` before redeploying.

Deleting an index is destructive to any query that depends on it — do not delete
indexes as part of a rollback.

---

## App Check enforcement

App Check is off by default so the backend works before it is registered.

1. Register the web app under **App Check** with reCAPTCHA Enterprise.
2. Set `VITE_RECAPTCHA_SITE_KEY` and redeploy Hosting.
3. Watch **App Check → Metrics** until verified requests dominate. Do not skip this —
   enforcing early locks out real users.
4. Enforce it on the backend by setting `APP_CHECK_ENFORCE=true` in the functions'
   environment and redeploying:

   ```bash
   # functions/.env.<project-id>  (committed only if it holds no secrets)
   APP_CHECK_ENFORCE=true
   ```

   ```bash
   firebase deploy --only functions --project prod
   ```

To back it out, set the value to anything other than `true` and redeploy.

---

## Monitoring and alerts

Set these up once billing is live:

- **Budget alerts** — Google Cloud console → Billing → Budgets & alerts. Alert at
  50/90/100% of your monthly ceiling. Firestore reads are the cost driver here;
  a feed regression that drops the query constraints could be expensive.
- **Error Reporting** — enabled by default for Cloud Functions. Add a notification
  channel so new exception types page someone.
- **Cloud Logging** — function logs: `firebase functions:log --project prod`, or
  Logs Explorer with `resource.type="cloud_run_revision"`.
- **Alerting policies** worth having: function error rate > 1%, function p95 latency,
  Firestore read count anomaly.

### Reading the moderation queue

`reports/` is denied to every client. Read it from the console
(**Firestore → Data → reports**) or with the Admin SDK. There is no admin UI yet.

---

## Rate limits

Fixed-window per-account counters in `rateLimits/{uid}_{action}`, with the limits in
[`shared/constants.ts`](../shared/constants.ts). To change one, edit that file and
redeploy the functions — no schema change needed.

To clear a limit for one account (support request):

```bash
# Firestore console → rateLimits → delete <uid>_castVote
```

Counters are consumed before the work runs, so a failed operation still costs a unit.
That is intentional for abuse resistance.

---

## Backing up the v1 Realtime Database

v2 starts with a clean Firestore, so nothing is migrated. Take an immutable snapshot
of the old data before decommissioning it:

```bash
# Whole-database JSON export (fine at this data volume)
firebase database:get / --project <legacy-project-id> --output backups/rtdb-$(date +%Y%m%d).json

# Verify it is non-trivial before you trust it
python3 -c "import json;d=json.load(open('backups/rtdb-$(date +%Y%m%d).json'));print(sorted(d.keys()))"
```

Then, in the Firebase console for the legacy project:

1. **Realtime Database → Rules →** set `{"rules":{".read":false,".write":false}}` to
   freeze it.
2. Keep the export somewhere durable and outside the repo (`backups/` is gitignored).
3. Only delete the legacy database after v2 has been validated in production.

Legacy shapes, for reference if you ever need to read the export:
`all-questions/{pushId}` (`title`, `options[{text,votes}]`, `tags`, `creator`,
`anonymous`, `priv`, `createdAt`, `id`), `users/{uid}` (`username`, `questions`,
`following`, `followers`, `answered`) and `usernames/{uid}`.

---

## Firestore backups (v2)

Once production has real data, turn on scheduled backups:

```bash
gcloud firestore backups schedules create \
  --database='(default)' \
  --recurrence=daily \
  --retention=7d \
  --project=<prod-project-id>
```

Restores create a **new** database; they do not overwrite in place. Plan a restore as
a swap, not an undo.

---

## Pre-launch checklist

- [ ] JDK 21+ installed; `npm run test` green locally
- [ ] `.firebaserc` has real project IDs; `app/.env.local` filled in
- [ ] Google sign-in enabled and authorized domains set, per project
- [ ] Rules and indexes deployed; every index _Enabled_
- [ ] `npm run test:rules` and `npm run test:functions` green in CI
- [ ] Playwright critical flow green in CI
- [ ] Manual pass on current Chrome, Safari and Firefox, plus a real phone
- [ ] Budget alert configured
- [ ] Error Reporting notification channel configured
- [ ] App Check registered (enforcement can follow)
- [ ] Legacy RTDB exported and set read-only
- [ ] Rollback procedure above read by whoever is on call
