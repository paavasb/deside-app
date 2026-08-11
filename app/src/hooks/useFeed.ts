import { useInfiniteQuery } from '@tanstack/react-query';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import { PAGE_SIZE } from '@shared/constants';
import type { Question, QuestionWithViewerState } from '@shared/types';
import { useUid } from '@/auth/useAuth';
import { hasMoreItems, mergeDescending, type MergeSource } from '@/features/feed/merge';
import { api } from '@/lib/api';
import {
  fetchPublicFeed,
  fetchViewerAnswers,
  fetchViewerAuthored,
  type PublicFeedFilters,
} from '@/lib/firestore';
import { queryKeys } from '@/lib/queryKeys';

/**
 * `all`       — everything the viewer can see: public questions, plus followers-only
 *               questions from people they follow. Two paginated sources, merged.
 * `public`    — public questions only.
 * `following` — questions from people they follow, at any visibility those authors
 *               granted them (public and followers-only).
 */
export type FeedSource = 'all' | 'public' | 'following';

/**
 * Position of both streams, carried from one page to the next.
 *
 * `*Buffer` holds items that were fetched but not yet emitted. That lookahead is what
 * keeps the merged order correct across page boundaries — see features/feed/merge.ts.
 *
 * Treated as immutable: each page returns a fresh object, because React Query stores
 * page params and replays them on refetch.
 */
interface FeedCursor {
  publicCursor: QueryDocumentSnapshot | null;
  publicExhausted: boolean;
  publicBuffer: QuestionWithViewerState[];
  followingCursor: string | null;
  followingExhausted: boolean;
  followingBuffer: QuestionWithViewerState[];
  /** IDs already emitted, so a mid-pagination visibility change can't duplicate a row. */
  seen: string[];
}

export interface FeedPage {
  items: QuestionWithViewerState[];
  /** Next page param, or `null` when both streams are drained. */
  next: FeedCursor | null;
}

/**
 * Attaches the viewer's own relationship to a page of questions.
 *
 * Both lookups are batched over the page's IDs, so cost stays constant per page rather
 * than growing with the viewer's history. `authored` is read from the owner-only index
 * because an anonymous question carries no `authorId`.
 */
async function withViewerState(
  uid: string,
  questions: readonly Question[],
): Promise<QuestionWithViewerState[]> {
  const ids = questions.map((question) => question.id);
  const [answers, authored] = await Promise.all([
    fetchViewerAnswers(uid, ids),
    fetchViewerAuthored(uid, ids),
  ]);

  return questions.map((question) => ({
    ...question,
    viewerOptionId: answers.get(question.id) ?? null,
    viewerIsAuthor: authored.has(question.id),
  }));
}

function initialCursor(source: FeedSource): FeedCursor {
  return {
    publicCursor: null,
    // A single-source mode is just the merge with one stream switched off, which keeps
    // all three modes on one code path instead of three near-copies.
    publicExhausted: source === 'following',
    publicBuffer: [],
    followingCursor: null,
    followingExhausted: source === 'public',
    followingBuffer: [],
    seen: [],
  };
}

/**
 * The question feed.
 *
 * Public questions are read straight from Firestore — cheap, cacheable, and constrained
 * to `visibility == 'public' && status == 'active'` so the query satisfies the list
 * rule. Followers-only questions come from the `listFollowingFeed` callable, which is
 * their only read path: those documents are never client-readable, so the follow edge is
 * checked server-side.
 *
 * In `all` mode the callable is asked for `scope: 'followers'`. A followed author's
 * public questions therefore arrive from the Firestore query alone, never twice.
 *
 * Both streams are consumed newest-first whenever they are merged, because merging two
 * differently-ordered streams is not sound. "Most voted" is re-ranked over the loaded
 * questions by the caller, and the UI says so.
 */
export function useFeed(source: FeedSource, filters: PublicFeedFilters) {
  const uid = useUid();

  return useInfiniteQuery<FeedPage, Error, FeedPage[], readonly unknown[], FeedCursor | null>({
    queryKey: queryKeys.feed(uid, source, filters),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.next,
    queryFn: async ({ pageParam }) => {
      const state = pageParam ?? initialCursor(source);
      const seen = new Set(state.seen);

      // Local, mutable positions for this fetch only; snapshotted below.
      let publicCursor = state.publicCursor;
      let followingCursor = state.followingCursor;

      const publicSource: MergeSource<QuestionWithViewerState> = {
        buffer: [...state.publicBuffer],
        exhausted: state.publicExhausted,
        fetchMore: async () => {
          const page = await fetchPublicFeed(
            // Only the public-only mode can use the requested server-side sort; the
            // merged modes must read newest-first.
            source === 'public' ? filters : { ...filters, sort: 'newest' },
            publicCursor,
            PAGE_SIZE,
          );
          publicCursor = page.cursor;
          return {
            items: await withViewerState(uid, page.questions),
            exhausted: page.cursor === null,
          };
        },
      };

      const followingSource: MergeSource<QuestionWithViewerState> = {
        buffer: [...state.followingBuffer],
        exhausted: state.followingExhausted,
        fetchMore: async () => {
          const page = await api.listFollowingFeed({
            cursor: followingCursor,
            tags: filters.tags,
            limit: PAGE_SIZE,
            scope: source === 'all' ? 'followers' : 'all',
          });
          followingCursor = page.nextCursor;
          return { items: page.items, exhausted: page.nextCursor === null };
        },
      };

      const sources = [publicSource, followingSource];

      const items = await mergeDescending({
        sources,
        count: PAGE_SIZE,
        key: (question) => question.createdAt,
        id: (question) => question.id,
        seen,
      });

      const next: FeedCursor | null = hasMoreItems(sources)
        ? {
            publicCursor,
            publicExhausted: publicSource.exhausted,
            publicBuffer: publicSource.buffer,
            followingCursor,
            followingExhausted: followingSource.exhausted,
            followingBuffer: followingSource.buffer,
            seen: [...seen],
          }
        : null;

      return { items, next };
    },
    select: (data) => data.pages,
  });
}
