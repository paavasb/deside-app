import type { DocumentSnapshot } from 'firebase-admin/firestore';
import { Timestamp } from 'firebase-admin/firestore';
import { emptyStats } from '../../../shared/score';
import type {
  ProfileStats,
  PublicProfile,
  Question,
  QuestionOption,
  QuestionStatus,
  Visibility,
} from '../../../shared/types';

export function toMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === 'number') return value;
  return 0;
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function toStats(value: unknown): ProfileStats {
  const raw = (value ?? {}) as Record<string, unknown>;
  const read = (key: keyof ProfileStats) =>
    typeof raw[key] === 'number' && Number.isFinite(raw[key]) ? raw[key] : 0;
  return {
    questions: read('questions'),
    answers: read('answers'),
    followers: read('followers'),
    following: read('following'),
  };
}

function toOptions(value: unknown): QuestionOption[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null) return [];
    const option = entry as Record<string, unknown>;
    if (typeof option.id !== 'string' || typeof option.text !== 'string') return [];
    return [{ id: option.id, text: option.text }];
  });
}

function toOptionVotes(value: unknown, options: QuestionOption[]): Record<string, number> {
  const raw = (value ?? {}) as Record<string, unknown>;
  const votes: Record<string, number> = {};
  for (const option of options) {
    const count = raw[option.id];
    votes[option.id] = typeof count === 'number' && Number.isFinite(count) ? count : 0;
  }
  return votes;
}

/**
 * Converts a question document into the client wire shape.
 *
 * `authorId`/`authorHandle` are forced to `null` for anonymous questions. The
 * writer already stores them as null, so this is defense in depth: any future
 * write path that forgets cannot leak the author through a callable response.
 */
export function serializeQuestion(snapshot: DocumentSnapshot): Question {
  const data = snapshot.data() ?? {};
  const anonymous = data.anonymous === true;
  const options = toOptions(data.options);

  return {
    id: snapshot.id,
    title: typeof data.title === 'string' ? data.title : '',
    options,
    optionVotes: toOptionVotes(data.optionVotes, options),
    totalVotes: typeof data.totalVotes === 'number' ? data.totalVotes : 0,
    tags: Array.isArray(data.tags)
      ? data.tags.filter((tag): tag is string => typeof tag === 'string')
      : [],
    visibility: (data.visibility === 'followers' ? 'followers' : 'public') satisfies Visibility,
    anonymous,
    status: (data.status === 'removed' ? 'removed' : 'active') satisfies QuestionStatus,
    authorId: anonymous ? null : toStringOrNull(data.authorId),
    authorHandle: anonymous ? null : toStringOrNull(data.authorHandle),
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

export function serializeProfile(snapshot: DocumentSnapshot): PublicProfile {
  const data = snapshot.data() ?? {};
  const stats = data.stats === undefined ? emptyStats : toStats(data.stats);
  return {
    uid: snapshot.id,
    handle: typeof data.handle === 'string' ? data.handle : '',
    displayName: toStringOrNull(data.displayName),
    photoURL: toStringOrNull(data.photoURL),
    stats,
    score: typeof data.score === 'number' ? data.score : 0,
    createdAt: toMillis(data.createdAt),
  };
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
