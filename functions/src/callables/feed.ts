import { Timestamp } from 'firebase-admin/firestore';
import { FEED_AUTHOR_CHUNK, FEED_MAX_FOLLOWED_AUTHORS } from '../../../shared/constants';
import { listFollowingFeedInput } from '../../../shared/schemas';
import type { Page, QuestionWithViewerState } from '../../../shared/types';
import { collections, db, profileRef, questionRef, subcollections, voteRef } from '../firebase';
import { defineCallable } from '../lib/callable';
import { cursorTimestamp, decodeCursor, encodeCursor } from '../lib/cursor';
import { chunk, serializeQuestion } from '../lib/serialize';

interface FeedEntry {
  questionId: string;
  createdAt: Timestamp;
}

/**
 * The personalized feed: active questions authored by accounts the caller follows,
 * at any visibility those authors granted them (public and followers-only).
 *
 * This is the read path that makes followers-only questions private. Access is
 * decided here from the caller's own follow edges, and the followers-only documents
 * are never exposed to a client query — `firestore.rules` grants `list` on
 * `questions` only for `visibility == 'public'`.
 *
 * Fan-out happens over the server-private `questionAuthors` index rather than
 * `questions`, because an anonymous question stores no author on the readable
 * document. That means the feed correctly includes anonymous questions written by
 * people you follow, while still never revealing who wrote them.
 */
export const listFollowingFeed = defineCallable(
  'listFollowingFeed',
  listFollowingFeedInput,
  async ({ uid, input }): Promise<Page<QuestionWithViewerState>> => {
    const limit = input.limit;
    const cursor = decodeCursor(input.cursor);

    const following = await profileRef(uid)
      .collection(subcollections.following)
      .limit(FEED_MAX_FOLLOWED_AUTHORS)
      .get();

    if (following.empty) {
      return { items: [], nextCursor: null };
    }

    const authorIds = following.docs.map((doc) => doc.id);

    // Firestore caps `in` at 30 values, so page each chunk of followed authors and
    // merge. Fetching limit+1 per chunk is what lets the merge know there is more.
    const chunks = chunk(authorIds, FEED_AUTHOR_CHUNK);
    const perChunk = await Promise.all(
      chunks.map(async (authorChunk) => {
        let query = db
          .collection(collections.questionAuthors)
          .where('status', '==', 'active')
          .where('authorId', 'in', authorChunk);

        // The merged feed unions this with a direct public-question query, so it asks
        // for followers-only questions to avoid returning a followed author's public
        // questions on both sides of that union.
        if (input.scope === 'followers') {
          query = query.where('visibility', '==', 'followers');
        }

        query = query.orderBy('createdAt', 'desc').limit(limit + 1);

        if (cursor) {
          query = query.startAfter(cursorTimestamp(cursor));
        }

        const snapshot = await query.get();
        return snapshot.docs.flatMap<FeedEntry>((doc) => {
          const createdAt = doc.get('createdAt');
          return createdAt instanceof Timestamp ? [{ questionId: doc.id, createdAt }] : [];
        });
      }),
    );

    const merged = perChunk.flat().sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

    const hasMore = merged.length > limit;
    const page = merged.slice(0, limit);

    if (page.length === 0) {
      return { items: [], nextCursor: null };
    }

    // One batched read for the question bodies, one for this caller's own votes.
    const [questionSnapshots, voteSnapshots] = await Promise.all([
      db.getAll(...page.map((entry) => questionRef(entry.questionId))),
      db.getAll(...page.map((entry) => voteRef(entry.questionId, uid))),
    ]);

    const viewerVotes = new Map<string, string>();
    voteSnapshots.forEach((snapshot, index) => {
      const entry = page[index];
      if (entry && snapshot.exists && typeof snapshot.get('optionId') === 'string') {
        viewerVotes.set(entry.questionId, snapshot.get('optionId') as string);
      }
    });

    const tagFilter = input.tags;

    const items = questionSnapshots
      .filter((snapshot) => snapshot.exists && snapshot.get('status') === 'active')
      .map((snapshot) => serializeQuestion(snapshot))
      // Tag filtering is applied here rather than in the query: Firestore rejects
      // combining `authorId in [...]` with `tags array-contains-any [...]`. A page
      // can therefore come back shorter than `limit` while `nextCursor` is still set.
      .filter(
        (question) =>
          tagFilter.length === 0 || question.tags.some((tag) => tagFilter.includes(tag)),
      )
      .map<QuestionWithViewerState>((question) => ({
        ...question,
        viewerOptionId: viewerVotes.get(question.id) ?? null,
        viewerIsAuthor: false,
      }));

    const last = page[page.length - 1];
    const nextCursor = hasMore && last ? encodeCursor(last.createdAt, last.questionId) : null;

    return { items, nextCursor };
  },
);
