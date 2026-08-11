import {
  Timestamp,
  collection,
  doc,
  documentId,
  endAt,
  getDoc,
  getDocs,
  limit as limitTo,
  orderBy,
  query,
  startAfter,
  startAt,
  where,
  type DocumentSnapshot,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { PAGE_SIZE } from '@shared/constants';
import { emptyStats } from '@shared/score';
import type {
  FollowEdge,
  ProfileStats,
  PublicProfile,
  Question,
  QuestionOption,
} from '@shared/types';
import { toAppError } from './appError';
import { db } from './firebase';

/**
 * Direct Firestore reads.
 *
 * Only reads live here — the browser has no write access at all. Each query below
 * is shaped to satisfy `firestore.rules`; in particular the public feed *must* carry
 * `visibility == 'public'` and `status == 'active'`, because list rules are evaluated
 * per candidate document and a broader query fails outright rather than returning a
 * filtered subset.
 */

/**
 * Firestore caps `in` / `array-contains-any` at 30 values.
 *
 * Every batched lookup below also passes an explicit `limit`, because the `list` rules
 * in firestore.rules compare against `request.query.limit` — a query with no limit
 * clause has nothing for that comparison to succeed against.
 */
const MAX_IN_CLAUSE = 30;

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

function millis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === 'number') return value;
  return 0;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function stats(value: unknown): ProfileStats {
  const raw = (value ?? {}) as Record<string, unknown>;
  const read = (key: keyof ProfileStats) =>
    typeof raw[key] === 'number' && Number.isFinite(raw[key]) ? (raw[key] as number) : 0;
  return {
    questions: read('questions'),
    answers: read('answers'),
    followers: read('followers'),
    following: read('following'),
  };
}

export function questionFromSnapshot(snapshot: DocumentSnapshot): Question {
  const data = snapshot.data() ?? {};
  const anonymous = data.anonymous === true;

  const options: QuestionOption[] = Array.isArray(data.options)
    ? data.options.flatMap((entry: unknown) => {
        if (typeof entry !== 'object' || entry === null) return [];
        const option = entry as Record<string, unknown>;
        return typeof option.id === 'string' && typeof option.text === 'string'
          ? [{ id: option.id, text: option.text }]
          : [];
      })
    : [];

  const rawVotes = (data.optionVotes ?? {}) as Record<string, unknown>;
  const optionVotes: Record<string, number> = {};
  for (const option of options) {
    const count = rawVotes[option.id];
    optionVotes[option.id] = typeof count === 'number' && Number.isFinite(count) ? count : 0;
  }

  return {
    id: snapshot.id,
    title: typeof data.title === 'string' ? data.title : '',
    options,
    optionVotes,
    totalVotes: typeof data.totalVotes === 'number' ? data.totalVotes : 0,
    tags: Array.isArray(data.tags)
      ? data.tags.filter((tag: unknown): tag is string => typeof tag === 'string')
      : [],
    visibility: data.visibility === 'followers' ? 'followers' : 'public',
    anonymous,
    status: data.status === 'removed' ? 'removed' : 'active',
    authorId: anonymous ? null : text(data.authorId),
    authorHandle: anonymous ? null : text(data.authorHandle),
    createdAt: millis(data.createdAt),
    updatedAt: millis(data.updatedAt),
  };
}

export function profileFromSnapshot(snapshot: DocumentSnapshot): PublicProfile {
  const data = snapshot.data() ?? {};
  return {
    uid: snapshot.id,
    handle: typeof data.handle === 'string' ? data.handle : '',
    displayName: text(data.displayName),
    photoURL: text(data.photoURL),
    stats: data.stats === undefined ? emptyStats : stats(data.stats),
    score: typeof data.score === 'number' ? data.score : 0,
    createdAt: millis(data.createdAt),
  };
}

// ---------------------------------------------------------------------------
// Public feed
// ---------------------------------------------------------------------------

export type FeedSort = 'newest' | 'votes';

export interface PublicFeedFilters {
  /** Normalized tags; matched with `array-contains-any`. */
  tags: string[];
  sort: FeedSort;
  /** Inclusive bounds in epoch millis. */
  startDate: number | null;
  endDate: number | null;
}

export interface PublicFeedPage {
  questions: Question[];
  /** Pass back to fetch the next page. `null` when the feed is exhausted. */
  cursor: QueryDocumentSnapshot | null;
}

/**
 * Reads a page of the public feed.
 *
 * A `createdAt` range filter forces `createdAt` to be the first `orderBy`, so
 * "most voted" cannot be applied server-side while a date range is active. In that
 * case this returns newest-first and the caller re-ranks the loaded pages; the UI
 * says as much rather than silently ignoring the sort.
 */
export async function fetchPublicFeed(
  filters: PublicFeedFilters,
  cursor: QueryDocumentSnapshot | null,
  pageSize: number = PAGE_SIZE,
): Promise<PublicFeedPage> {
  const hasDateRange = filters.startDate !== null || filters.endDate !== null;
  const sortByVotesServerSide = filters.sort === 'votes' && !hasDateRange;

  const constraints: QueryConstraint[] = [
    where('visibility', '==', 'public'),
    where('status', '==', 'active'),
  ];

  if (filters.tags.length > 0) {
    constraints.push(where('tags', 'array-contains-any', filters.tags.slice(0, 10)));
  }
  if (filters.startDate !== null) {
    constraints.push(where('createdAt', '>=', Timestamp.fromMillis(filters.startDate)));
  }
  if (filters.endDate !== null) {
    constraints.push(where('createdAt', '<=', Timestamp.fromMillis(filters.endDate)));
  }

  if (sortByVotesServerSide) {
    constraints.push(orderBy('totalVotes', 'desc'));
  }
  constraints.push(orderBy('createdAt', 'desc'));

  if (cursor) {
    constraints.push(startAfter(cursor));
  }
  constraints.push(limitTo(pageSize));

  try {
    const snapshot = await getDocs(query(collection(db, 'questions'), ...constraints));
    const last = snapshot.docs.at(-1) ?? null;
    return {
      questions: snapshot.docs.map(questionFromSnapshot),
      // A short page means the collection is exhausted for these filters.
      cursor: snapshot.docs.length < pageSize ? null : last,
    };
  } catch (error) {
    throw toAppError(error);
  }
}

// ---------------------------------------------------------------------------
// Viewer's own records
// ---------------------------------------------------------------------------

/**
 * Looks up which option the viewer picked, for a specific batch of questions.
 *
 * Batched per feed page rather than loading the viewer's whole answer history, so
 * the cost stays constant no matter how much they've voted.
 */
export async function fetchViewerAnswers(
  uid: string,
  questionIds: readonly string[],
): Promise<Map<string, string>> {
  const answers = new Map<string, string>();
  if (questionIds.length === 0) return answers;

  const answersRef = collection(db, 'profiles', uid, 'answers');
  const batches: string[][] = [];
  for (let index = 0; index < questionIds.length; index += MAX_IN_CLAUSE) {
    batches.push(questionIds.slice(index, index + MAX_IN_CLAUSE));
  }

  try {
    const results = await Promise.all(
      batches.map((batch) =>
        getDocs(query(answersRef, where(documentId(), 'in', batch), limitTo(batch.length))),
      ),
    );
    for (const result of results) {
      for (const document of result.docs) {
        const optionId = document.get('optionId');
        if (typeof optionId === 'string') answers.set(document.id, optionId);
      }
    }
  } catch (error) {
    throw toAppError(error);
  }

  return answers;
}

/**
 * Which of the given questions the viewer authored.
 *
 * Reads the owner-only `authored` index rather than comparing `authorId`, because an
 * anonymous question stores `authorId: null`. Without this, the feed could not tell
 * an author that a question is theirs without also telling everyone else.
 */
export async function fetchViewerAuthored(
  uid: string,
  questionIds: readonly string[],
): Promise<Set<string>> {
  const authored = new Set<string>();
  if (questionIds.length === 0) return authored;

  const authoredRef = collection(db, 'profiles', uid, 'authored');
  const batches: string[][] = [];
  for (let index = 0; index < questionIds.length; index += MAX_IN_CLAUSE) {
    batches.push(questionIds.slice(index, index + MAX_IN_CLAUSE));
  }

  try {
    const results = await Promise.all(
      batches.map((batch) =>
        getDocs(query(authoredRef, where(documentId(), 'in', batch), limitTo(batch.length))),
      ),
    );
    for (const result of results) {
      for (const document of result.docs) authored.add(document.id);
    }
  } catch (error) {
    throw toAppError(error);
  }

  return authored;
}

// ---------------------------------------------------------------------------
// Profiles and follows
// ---------------------------------------------------------------------------

export async function fetchProfile(uid: string): Promise<PublicProfile | null> {
  try {
    const snapshot = await getDoc(doc(db, 'profiles', uid));
    return snapshot.exists() ? profileFromSnapshot(snapshot) : null;
  } catch (error) {
    throw toAppError(error);
  }
}

export async function fetchProfileByHandle(handle: string): Promise<PublicProfile | null> {
  try {
    const claim = await getDoc(doc(db, 'handles', handle.toLowerCase()));
    if (!claim.exists()) return null;
    const uid = claim.get('uid');
    return typeof uid === 'string' ? await fetchProfile(uid) : null;
  } catch (error) {
    throw toAppError(error);
  }
}

/** True when the handle is unclaimed. Used for the availability hint on the form. */
export async function isHandleAvailable(normalizedHandle: string): Promise<boolean> {
  try {
    const snapshot = await getDoc(doc(db, 'handles', normalizedHandle));
    return !snapshot.exists();
  } catch (error) {
    throw toAppError(error);
  }
}

/** Prefix search over `handleLower`. Firestore has no substring search. */
export async function searchProfiles(prefix: string, max = 10): Promise<PublicProfile[]> {
  const normalized = prefix.trim().toLowerCase();
  if (normalized.length === 0) return [];

  try {
    const snapshot = await getDocs(
      query(
        collection(db, 'profiles'),
        orderBy('handleLower'),
        startAt(normalized),
        // U+F8FF sorts after any ordinary character, so [prefix, prefix+U+F8FF]
        // is exactly the range of strings beginning with `prefix`.
        endAt(`${normalized}`),
        limitTo(max),
      ),
    );
    return snapshot.docs.map(profileFromSnapshot);
  } catch (error) {
    throw toAppError(error);
  }
}

function followEdgeFrom(snapshot: QueryDocumentSnapshot): FollowEdge {
  return {
    uid: snapshot.id,
    handle: typeof snapshot.get('handle') === 'string' ? (snapshot.get('handle') as string) : '',
    createdAt: millis(snapshot.get('createdAt')),
  };
}

/** Reads the signed-in user's own follow list. Only the owner can read these. */
export async function fetchFollowEdges(
  uid: string,
  direction: 'following' | 'followers',
  max = 50,
): Promise<FollowEdge[]> {
  try {
    const snapshot = await getDocs(
      query(collection(db, 'profiles', uid, direction), orderBy('createdAt', 'desc'), limitTo(max)),
    );
    return snapshot.docs.map(followEdgeFrom);
  } catch (error) {
    throw toAppError(error);
  }
}

/** Whether the signed-in user follows each of the given accounts. */
export async function fetchFollowingFlags(
  uid: string,
  targetUids: readonly string[],
): Promise<Set<string>> {
  const following = new Set<string>();
  const targets = targetUids.filter((target) => target !== uid);
  if (targets.length === 0) return following;

  const followingRef = collection(db, 'profiles', uid, 'following');
  const batches: string[][] = [];
  for (let index = 0; index < targets.length; index += MAX_IN_CLAUSE) {
    batches.push(targets.slice(index, index + MAX_IN_CLAUSE));
  }

  try {
    const results = await Promise.all(
      batches.map((batch) =>
        getDocs(query(followingRef, where(documentId(), 'in', batch), limitTo(batch.length))),
      ),
    );
    for (const result of results) {
      for (const document of result.docs) following.add(document.id);
    }
  } catch (error) {
    throw toAppError(error);
  }

  return following;
}
