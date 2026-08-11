import { randomUUID } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import {
  createQuestionInput,
  deleteQuestionInput,
  getQuestionInput,
  listMyQuestionsInput,
  updateQuestionInput,
} from '../../../shared/schemas';
import { calculateScore } from '../../../shared/score';
import type { Page, QuestionWithViewerState } from '../../../shared/types';
import {
  authoredRef,
  db,
  followingRef,
  profileRef,
  questionAuthorRef,
  questionRef,
  subcollections,
  voteRef,
} from '../firebase';
import { defineCallable } from '../lib/callable';
import { cursorTimestamp, decodeCursor, encodeCursor } from '../lib/cursor';
import { serializeQuestion } from '../lib/serialize';
import { nextStats } from '../lib/stats';

/**
 * Creates a question.
 *
 * All four documents — the public question, the server-private author record, the
 * author's owner-only index entry, and the author's stat counters — are written in
 * one transaction. A half-created question would either be unattributable or
 * invisible to its own author, so it must be all-or-nothing.
 */
export const createQuestion = defineCallable(
  'createQuestion',
  createQuestionInput,
  async ({ uid, input }): Promise<QuestionWithViewerState> => {
    const options = input.options.map((text) => ({ id: randomUUID(), text }));
    const optionVotes: Record<string, number> = {};
    for (const option of options) {
      optionVotes[option.id] = 0;
    }

    const ref = questionRef(db.collection('questions').doc().id);

    await db.runTransaction(async (tx) => {
      const profileSnapshot = await tx.get(profileRef(uid));
      if (!profileSnapshot.exists) {
        throw new HttpsError('failed-precondition', 'Your profile has not been set up yet.');
      }

      const handle = profileSnapshot.get('handle');
      const now = FieldValue.serverTimestamp();

      tx.set(ref, {
        title: input.title,
        options,
        optionVotes,
        totalVotes: 0,
        tags: input.tags,
        visibility: input.visibility,
        anonymous: input.anonymous,
        status: 'active',
        // An anonymous question stores no author. The author is recoverable only
        // from questionAuthors/{id}, which no client can read.
        authorId: input.anonymous ? null : uid,
        authorHandle: input.anonymous ? null : (handle ?? null),
        createdAt: now,
        updatedAt: now,
      });

      tx.set(questionAuthorRef(ref.id), {
        authorId: uid,
        visibility: input.visibility,
        anonymous: input.anonymous,
        status: 'active',
        createdAt: now,
      });

      tx.set(authoredRef(uid, ref.id), {
        questionId: ref.id,
        visibility: input.visibility,
        anonymous: input.anonymous,
        createdAt: now,
      });

      const stats = nextStats(profileSnapshot.get('stats'), { questions: 1 });
      tx.update(profileRef(uid), {
        stats,
        score: calculateScore(stats),
        updatedAt: now,
      });
    });

    const saved = await ref.get();
    return { ...serializeQuestion(saved), viewerOptionId: null, viewerIsAuthor: true };
  },
  { rateLimit: 'createQuestion' },
);

/**
 * Updates the metadata a question's author is allowed to change.
 *
 * Visibility and anonymity can change at any time. Title and tags are frozen once
 * the first vote lands — editing the wording after people have answered would
 * misrepresent the results they contributed to.
 */
export const updateQuestion = defineCallable(
  'updateQuestion',
  updateQuestionInput,
  async ({ uid, input }): Promise<QuestionWithViewerState> => {
    const ref = questionRef(input.questionId);

    await db.runTransaction(async (tx) => {
      const [questionSnapshot, authorSnapshot] = await Promise.all([
        tx.get(ref),
        tx.get(questionAuthorRef(input.questionId)),
      ]);

      if (!questionSnapshot.exists || !authorSnapshot.exists) {
        throw new HttpsError('not-found', 'That question no longer exists.');
      }
      if (authorSnapshot.get('authorId') !== uid) {
        throw new HttpsError('permission-denied', 'You can only edit your own questions.');
      }
      if (questionSnapshot.get('status') !== 'active') {
        throw new HttpsError('failed-precondition', 'That question has been deleted.');
      }

      const totalVotes = questionSnapshot.get('totalVotes');
      const hasVotes = typeof totalVotes === 'number' && totalVotes > 0;

      if ((input.title !== undefined || input.tags !== undefined) && hasVotes) {
        throw new HttpsError(
          'failed-precondition',
          'This question already has votes, so its wording and tags are locked. You can still change visibility or anonymity.',
        );
      }

      const anonymous = input.anonymous ?? questionSnapshot.get('anonymous') === true;
      const visibility = input.visibility ?? questionSnapshot.get('visibility');
      const now = FieldValue.serverTimestamp();

      const questionUpdate: Record<string, unknown> = { updatedAt: now };
      if (input.title !== undefined) questionUpdate.title = input.title;
      if (input.tags !== undefined) questionUpdate.tags = input.tags;
      if (input.visibility !== undefined) questionUpdate.visibility = input.visibility;

      if (input.anonymous !== undefined) {
        questionUpdate.anonymous = anonymous;
        if (anonymous) {
          // Going anonymous must actually remove the author from the readable doc.
          questionUpdate.authorId = null;
          questionUpdate.authorHandle = null;
        } else {
          const profileSnapshot = await tx.get(profileRef(uid));
          questionUpdate.authorId = uid;
          questionUpdate.authorHandle = profileSnapshot.get('handle') ?? null;
        }
      }

      tx.update(ref, questionUpdate);
      tx.update(questionAuthorRef(input.questionId), { visibility, anonymous });
      tx.set(authoredRef(uid, input.questionId), { visibility, anonymous }, { merge: true });
    });

    const saved = await ref.get();
    const vote = await voteRef(input.questionId, uid).get();
    return {
      ...serializeQuestion(saved),
      viewerOptionId: vote.exists ? (vote.get('optionId') as string) : null,
      viewerIsAuthor: true,
    };
  },
  { rateLimit: 'updateQuestion' },
);

/**
 * Soft-deletes a question.
 *
 * The document is marked `removed` rather than destroyed so the vote records that
 * people contributed stay auditable for moderation. The author's owner-only index
 * entry is removed, which simultaneously drops it from "Your questions" and revokes
 * the author's `get` access granted by firestore.rules.
 */
export const deleteQuestion = defineCallable(
  'deleteQuestion',
  deleteQuestionInput,
  async ({ uid, input }): Promise<{ questionId: string }> => {
    await db.runTransaction(async (tx) => {
      const [questionSnapshot, authorSnapshot, profileSnapshot] = await Promise.all([
        tx.get(questionRef(input.questionId)),
        tx.get(questionAuthorRef(input.questionId)),
        tx.get(profileRef(uid)),
      ]);

      if (!questionSnapshot.exists || !authorSnapshot.exists) {
        throw new HttpsError('not-found', 'That question no longer exists.');
      }
      if (authorSnapshot.get('authorId') !== uid) {
        throw new HttpsError('permission-denied', 'You can only delete your own questions.');
      }
      if (questionSnapshot.get('status') !== 'active') {
        // Already deleted — treat as success so a double-click is not an error.
        return;
      }

      const now = FieldValue.serverTimestamp();
      tx.update(questionRef(input.questionId), { status: 'removed', updatedAt: now });
      tx.update(questionAuthorRef(input.questionId), { status: 'removed' });
      tx.delete(authoredRef(uid, input.questionId));

      const stats = nextStats(profileSnapshot.get('stats'), { questions: -1 });
      tx.update(profileRef(uid), { stats, score: calculateScore(stats), updatedAt: now });
    });

    return { questionId: input.questionId };
  },
  { rateLimit: 'deleteQuestion' },
);

/**
 * Reads a single question with the caller's own vote state.
 *
 * This is the only read path for followers-only questions. Access is decided here,
 * server-side, from the server-private author record and the caller's follow edge —
 * never by handing the document to the browser and hiding it in the UI.
 */
export const getQuestion = defineCallable(
  'getQuestion',
  getQuestionInput,
  async ({ uid, input }): Promise<QuestionWithViewerState> => {
    const snapshot = await questionRef(input.questionId).get();
    if (!snapshot.exists) {
      throw new HttpsError('not-found', 'That question no longer exists.');
    }

    const authorSnapshot = await questionAuthorRef(input.questionId).get();
    const authorId = authorSnapshot.exists ? (authorSnapshot.get('authorId') as string) : null;
    const viewerIsAuthor = authorId === uid;

    if (snapshot.get('status') !== 'active' && !viewerIsAuthor) {
      throw new HttpsError('not-found', 'That question no longer exists.');
    }

    if (!viewerIsAuthor && snapshot.get('visibility') === 'followers') {
      if (!authorId) {
        throw new HttpsError('permission-denied', 'You do not have access to that question.');
      }
      const follows = await followingRef(uid, authorId).get();
      if (!follows.exists) {
        throw new HttpsError(
          'permission-denied',
          'That question is only visible to people who follow its author.',
        );
      }
    }

    const vote = await voteRef(input.questionId, uid).get();
    return {
      ...serializeQuestion(snapshot),
      viewerOptionId: vote.exists ? (vote.get('optionId') as string) : null,
      viewerIsAuthor,
    };
  },
);

/**
 * Lists the caller's own questions, including anonymous and followers-only ones.
 *
 * Driven by the owner-only `profiles/{uid}/authored` index, which is the only place
 * an anonymous question is linked to its author from the client's side of the fence.
 */
export const listMyQuestions = defineCallable(
  'listMyQuestions',
  listMyQuestionsInput,
  async ({ uid, input }): Promise<Page<QuestionWithViewerState>> => {
    const cursor = decodeCursor(input.cursor);
    const limit = input.limit;

    let query = profileRef(uid)
      .collection(subcollections.authored)
      .orderBy('createdAt', 'desc')
      .limit(limit + 1);

    if (cursor) {
      query = query.startAfter(cursorTimestamp(cursor));
    }

    const authored = await query.get();
    const hasMore = authored.size > limit;
    const page = authored.docs.slice(0, limit);

    if (page.length === 0) {
      return { items: [], nextCursor: null };
    }

    const questionSnapshots = await db.getAll(...page.map((doc) => questionRef(doc.id)));
    const items = questionSnapshots
      .filter((snapshot) => snapshot.exists && snapshot.get('status') === 'active')
      .map((snapshot) => ({
        ...serializeQuestion(snapshot),
        // Authors cannot vote on their own questions, so there is never a vote here.
        viewerOptionId: null,
        viewerIsAuthor: true,
      }));

    const last = page[page.length - 1];
    const lastCreatedAt = last?.get('createdAt');
    const nextCursor =
      hasMore && last && lastCreatedAt instanceof Timestamp
        ? encodeCursor(lastCreatedAt, last.id)
        : null;

    return { items, nextCursor };
  },
);
