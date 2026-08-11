# DeSide data model

Every mutation happens in a callable Cloud Function using the Admin SDK. Clients
have **zero write access** to Firestore. Read access is granted narrowly by
`firestore.rules`, and the rules are exercised by `tests/rules/firestore.rules.test.ts`.

## Collections

### `profiles/{uid}`

Public directory entry for an account.

| Field         | Type           | Notes                                              |
| ------------- | -------------- | -------------------------------------------------- |
| `handle`      | string         | Display form of the handle.                        |
| `handleLower` | string         | Normalized; used for prefix search and uniqueness. |
| `displayName` | string \| null | From the Google account.                           |
| `photoURL`    | string \| null | From the Google account.                           |
| `stats`       | map            | `{ questions, answers, followers, following }`.    |
| `score`       | number         | DeSide Score, derived from `stats`.                |
| `createdAt`   | Timestamp      |                                                    |
| `updatedAt`   | Timestamp      |                                                    |

Reads: any signed-in user (`get`, and bounded `list` for user search).
Writes: functions only — so stats and score cannot be forged.

#### `profiles/{uid}/following/{targetUid}` and `profiles/{uid}/followers/{followerUid}`

`{ handle, createdAt }`. Readable **only by the owner**, so no account can
enumerate anyone else's social graph. Both sides of an edge are written in a single
transaction by `setFollow`, which also keeps the `followers`/`following` counters
consistent.

#### `profiles/{uid}/answers/{questionId}`

`{ questionId, optionId, createdAt }`. Owner-only. Powers the answered/unanswered
filter and the "you picked X" state without exposing anyone else's votes.

#### `profiles/{uid}/authored/{questionId}`

`{ questionId, visibility, anonymous, createdAt }`. Owner-only index of everything
this account authored, **including anonymous questions**. Two jobs:

1. Backs `listMyQuestions` ordering.
2. Acts as the authorship proof in `firestore.rules` — the question `get` rule
   checks `exists(.../authored/{questionId})`. That lets an author read their own
   question at any visibility without the question document having to name them,
   which is what keeps anonymity intact.

### `handles/{normalizedHandle}`

`{ uid, createdAt }`. The document ID _is_ the normalized handle, so claiming a
handle inside a transaction gives atomic case-insensitive uniqueness. `get` is
allowed (availability hints); `list` is denied so the directory is not dumpable.

### `questions/{questionId}`

The client-safe projection of a question.

| Field          | Type                      | Notes                                                   |
| -------------- | ------------------------- | ------------------------------------------------------- |
| `title`        | string                    |                                                         |
| `options`      | array of `{ id, text }`   | Stable option IDs; text stays editable before any vote. |
| `optionVotes`  | map `optionId -> number`  | Written only by `castVote`, via `FieldValue.increment`. |
| `totalVotes`   | number                    | Sort key for "most voted".                              |
| `tags`         | string[]                  | Normalized; queried with `array-contains-any`.          |
| `visibility`   | `'public' \| 'followers'` |                                                         |
| `anonymous`    | boolean                   |                                                         |
| `status`       | `'active' \| 'removed'`   | Deletes are soft, so vote records stay auditable.       |
| `authorId`     | string \| null            | **`null` whenever `anonymous` is true.**                |
| `authorHandle` | string \| null            | Denormalized; `null` when anonymous.                    |
| `createdAt`    | Timestamp                 |                                                         |
| `updatedAt`    | Timestamp                 |                                                         |

Reads:

- `list` — only where `visibility == 'public' && status == 'active'`, limit ≤ 50.
  Security rules are evaluated per candidate document on a list, so any broader
  query **fails** rather than returning a filtered subset. The client feed query
  must carry the matching `where` clauses.
- `get` — public+active questions, or the caller's own question at any visibility.

Followers-only questions are therefore **never** client-readable in bulk. They are
served only by `listFollowingFeed` and `getQuestion`, which verify the follow edge
server-side. This is the core correctness fix over v1, where "private" questions
were downloaded by every browser and merely hidden in React.

#### `questions/{questionId}/votes/{uid}`

`{ optionId, createdAt }`. A voter can `get` only their own document; `list` is
denied outright, so per-option voter identities can never be enumerated. Written
only inside the `castVote` transaction, whose existence check is what enforces one
vote per account atomically.

### `questionAuthors/{questionId}` — server only

`{ authorId, visibility, status, createdAt }`. **Denied to every client under
every rule.** Two jobs:

1. The only record of an anonymous question's author, kept for ownership and
   moderation.
2. The fan-out index for the following feed: `where status == 'active' and
authorId in <chunk of followed uids> order by createdAt desc`.

### `reports/{reportId}` — server only

`{ questionId, reporterId, reason, status, createdAt }`. Moderation queue.

### `rateLimits/{uid}_{action}` — server only

`{ count, windowStartedAt }`. Fixed-window per-account counters enforced inside a
transaction by every mutating callable. Limits live in `shared/constants.ts`.

## Why anonymity holds

An anonymous question's author is discoverable only through
`questionAuthors/{questionId}` and `profiles/{authorUid}/authored/{questionId}`.
The first is denied to all clients; the second is readable only by the author.
The question document itself stores `authorId: null`. So there is no client-visible
path — document read, query, or rule side effect — from an anonymous question back
to its author.

## Known query limitations

These are inherent to Firestore and are handled explicitly rather than papered over:

- **The merged feed spans two sources.** "Everything I can see" reads public questions
  from Firestore and followers-only ones from `listFollowingFeed` (with
  `scope: 'followers'`, so the two sets are disjoint). Firestore cannot express that
  union as one query, so it is merged client-side in `createdAt` order with lookahead
  buffering. A consequence: while merging, both streams must be read newest-first, so
  "most voted" becomes a client-side re-rank of the loaded questions.
- **Substring title search** has no server-side equivalent. The feed applies the
  text filter to already-loaded pages. A real implementation needs an external
  search index (Algolia / Typesense / Elastic). Surfaced in the UI as
  "filters the questions loaded so far".
- **"Order by relevance"** is the v1 heuristic (recency + votes + follow + unanswered)
  and cannot be expressed as a Firestore `orderBy`. Pages are fetched newest-first
  and re-ranked client-side.
- **A `createdAt` range filter forces `createdAt` to be the first `orderBy`.** When a
  date range is active, "most voted" degrades to a client-side re-rank of the loaded
  pages. The UI says so.
- **Answered / unanswered** filtering is applied client-side against the owner's
  `answers` subcollection, which is loaded once per session.
