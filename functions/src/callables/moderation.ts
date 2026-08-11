import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { reportQuestionInput } from '../../../shared/schemas';
import { collections, db, questionRef } from '../firebase';
import { defineCallable } from '../lib/callable';

/**
 * Files a report against a question.
 *
 * Reports land in `reports/`, which is denied to every client, so reporters cannot
 * see or tamper with each other's reports. The report ID is deterministic
 * (`{questionId}_{reporterId}`) so re-reporting updates the existing record instead
 * of flooding the queue.
 */
export const reportQuestion = defineCallable(
  'reportQuestion',
  reportQuestionInput,
  async ({ uid, input }): Promise<{ reported: true }> => {
    const question = await questionRef(input.questionId).get();
    if (!question.exists) {
      throw new HttpsError('not-found', 'That question no longer exists.');
    }

    await db.collection(collections.reports).doc(`${input.questionId}_${uid}`).set({
      questionId: input.questionId,
      reporterId: uid,
      reason: input.reason,
      status: 'open',
      createdAt: FieldValue.serverTimestamp(),
    });

    return { reported: true };
  },
  { rateLimit: 'reportQuestion' },
);
