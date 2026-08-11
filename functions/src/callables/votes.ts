import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { castVoteInput } from '../../../shared/schemas';
import { calculateScore } from '../../../shared/score';
import type { QuestionOption, QuestionWithViewerState } from '../../../shared/types';
import {
  answerRef,
  db,
  followingRef,
  profileRef,
  questionAuthorRef,
  questionRef,
  voteRef,
} from '../firebase';
import { defineCallable } from '../lib/callable';
import { serializeQuestion } from '../lib/serialize';
import { nextStats } from '../lib/stats';

/**
 * Casts one vote.
 *
 * This replaces v1's non-atomic `update({ options })` from the browser, which lost
 * concurrent votes (two voters read the same counter and wrote back the same +1) and
 * let a determined client set any counter to any value.
 *
 * Everything below happens in a single Firestore transaction, so the whole thing is
 * atomic and retries on contention:
 *
 *   1. verify the caller is signed in (the callable wrapper) and not the author,
 *   2. verify the question is active and visible to this caller,
 *   3. verify the option exists on this question,
 *   4. reject a second vote by the existence of `votes/{uid}`,
 *   5. write the voter record, bump exactly one option counter and the total,
 *      record the answer for the voter's own history, and update their stats.
 *
 * Step 4 is what makes one-vote-per-account real: the check and the write are in the
 * same transaction, so two simultaneous votes cannot both pass it.
 */
export const castVote = defineCallable(
  'castVote',
  castVoteInput,
  async ({ uid, input }): Promise<QuestionWithViewerState> => {
    const { questionId, optionId } = input;

    await db.runTransaction(async (tx) => {
      const [questionSnapshot, authorSnapshot, existingVote, profileSnapshot] = await Promise.all([
        tx.get(questionRef(questionId)),
        tx.get(questionAuthorRef(questionId)),
        tx.get(voteRef(questionId, uid)),
        tx.get(profileRef(uid)),
      ]);

      if (!questionSnapshot.exists) {
        throw new HttpsError('not-found', 'That question no longer exists.');
      }
      if (questionSnapshot.get('status') !== 'active') {
        throw new HttpsError('failed-precondition', 'That question is closed.');
      }
      if (!profileSnapshot.exists) {
        throw new HttpsError('failed-precondition', 'Your profile has not been set up yet.');
      }

      const authorId = authorSnapshot.exists ? (authorSnapshot.get('authorId') as string) : null;

      if (authorId === uid) {
        throw new HttpsError('permission-denied', 'You cannot vote on your own question.');
      }

      // Access check for followers-only questions happens here, not in the client.
      if (questionSnapshot.get('visibility') === 'followers') {
        if (!authorId) {
          throw new HttpsError('permission-denied', 'You do not have access to that question.');
        }
        const follows = await tx.get(followingRef(uid, authorId));
        if (!follows.exists) {
          throw new HttpsError(
            'permission-denied',
            'That question is only open to people who follow its author.',
          );
        }
      }

      const options = (questionSnapshot.get('options') ?? []) as QuestionOption[];
      if (!options.some((option) => option?.id === optionId)) {
        throw new HttpsError('invalid-argument', 'That option does not belong to this question.');
      }

      if (existingVote.exists) {
        throw new HttpsError('already-exists', 'You have already voted on this question.');
      }

      const now = FieldValue.serverTimestamp();

      tx.set(voteRef(questionId, uid), { optionId, createdAt: now });
      tx.update(questionRef(questionId), {
        [`optionVotes.${optionId}`]: FieldValue.increment(1),
        totalVotes: FieldValue.increment(1),
        updatedAt: now,
      });
      tx.set(answerRef(uid, questionId), { questionId, optionId, createdAt: now });

      const stats = nextStats(profileSnapshot.get('stats'), { answers: 1 });
      tx.update(profileRef(uid), { stats, score: calculateScore(stats), updatedAt: now });
    });

    // Read back outside the transaction so the caller gets the committed tallies,
    // including any concurrent votes that landed alongside theirs.
    const saved = await questionRef(questionId).get();
    return {
      ...serializeQuestion(saved),
      viewerOptionId: optionId,
      viewerIsAuthor: false,
    };
  },
  { rateLimit: 'castVote' },
);
