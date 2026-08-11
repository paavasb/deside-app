import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { setFollowInput } from '../../../shared/schemas';
import { calculateScore } from '../../../shared/score';
import { db, followerRef, followingRef, profileRef } from '../firebase';
import { defineCallable } from '../lib/callable';
import { nextStats } from '../lib/stats';

/**
 * Follows or unfollows another account.
 *
 * Both directions of the edge plus both accounts' counters are written in one
 * transaction. v1 wrote each side from the browser in separate un-coordinated calls,
 * which is why the legacy data has one-sided follower links.
 *
 * The operation is idempotent: following someone you already follow, or unfollowing
 * someone you do not, succeeds without double-counting.
 */
export const setFollow = defineCallable(
  'setFollow',
  setFollowInput,
  async ({ uid, input }): Promise<{ following: boolean }> => {
    const { targetUid, follow } = input;

    if (targetUid === uid) {
      throw new HttpsError('invalid-argument', 'You cannot follow yourself.');
    }

    await db.runTransaction(async (tx) => {
      const [viewerProfile, targetProfile, existingEdge] = await Promise.all([
        tx.get(profileRef(uid)),
        tx.get(profileRef(targetUid)),
        tx.get(followingRef(uid, targetUid)),
      ]);

      if (!viewerProfile.exists) {
        throw new HttpsError('failed-precondition', 'Your profile has not been set up yet.');
      }
      if (!targetProfile.exists) {
        throw new HttpsError('not-found', 'That account does not exist.');
      }

      // Already in the requested state — nothing to do, and importantly no counter
      // change, so repeated clicks cannot inflate anyone's follower count or score.
      if (existingEdge.exists === follow) {
        return;
      }

      const now = FieldValue.serverTimestamp();
      const viewerHandle = viewerProfile.get('handle') ?? null;
      const targetHandle = targetProfile.get('handle') ?? null;

      if (follow) {
        tx.set(followingRef(uid, targetUid), { handle: targetHandle, createdAt: now });
        tx.set(followerRef(targetUid, uid), { handle: viewerHandle, createdAt: now });
      } else {
        tx.delete(followingRef(uid, targetUid));
        tx.delete(followerRef(targetUid, uid));
      }

      const delta = follow ? 1 : -1;

      const viewerStats = nextStats(viewerProfile.get('stats'), { following: delta });
      tx.update(profileRef(uid), {
        stats: viewerStats,
        score: calculateScore(viewerStats),
        updatedAt: now,
      });

      const targetStats = nextStats(targetProfile.get('stats'), { followers: delta });
      tx.update(profileRef(targetUid), {
        stats: targetStats,
        score: calculateScore(targetStats),
        updatedAt: now,
      });
    });

    return { following: follow };
  },
  { rateLimit: 'setFollow' },
);
