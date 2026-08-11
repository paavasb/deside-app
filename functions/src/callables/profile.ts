import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { suggestHandle } from '../../../shared/handle';
import { ensureProfileInput, setHandleInput } from '../../../shared/schemas';
import { calculateScore, emptyStats } from '../../../shared/score';
import type { PublicProfile } from '../../../shared/types';
import { db, handleRef, profileRef, questionRef, subcollections } from '../firebase';
import { defineCallable } from '../lib/callable';
import { serializeProfile } from '../lib/serialize';

const HANDLE_SUGGESTION_ATTEMPTS = 6;

/**
 * Creates the caller's profile on first sign-in, or refreshes the Google-provided
 * display name and avatar on later sign-ins. Idempotent, so the client can call it
 * after every successful sign-in without special-casing new accounts.
 *
 * The profile document and the `handles/{normalizedHandle}` claim are written in a
 * single transaction, so a new account can never end up without a handle or with a
 * handle another account already owns.
 */
export const ensureProfile = defineCallable(
  'ensureProfile',
  ensureProfileInput,
  async ({ uid, input, token }): Promise<PublicProfile> => {
    const displayName = input.displayName ?? token.name ?? null;
    const photoURL = input.photoURL ?? token.picture ?? null;

    await db.runTransaction(async (tx) => {
      const ref = profileRef(uid);
      const snapshot = await tx.get(ref);

      if (snapshot.exists) {
        const data = snapshot.data() ?? {};
        // Only write when something actually changed, to avoid a write per sign-in.
        if (data.displayName !== displayName || data.photoURL !== photoURL) {
          tx.update(ref, { displayName, photoURL, updatedAt: FieldValue.serverTimestamp() });
        }
        return;
      }

      // Find a free handle. Candidates are checked inside the transaction so a
      // concurrent claim of the same handle forces a retry rather than a duplicate.
      const seed = displayName ?? token.email?.split('@')[0] ?? '';
      let claimed: string | null = null;
      for (let attempt = 0; attempt < HANDLE_SUGGESTION_ATTEMPTS; attempt += 1) {
        const candidate = suggestHandle(seed);
        const candidateSnapshot = await tx.get(handleRef(candidate));
        if (!candidateSnapshot.exists) {
          claimed = candidate;
          break;
        }
      }

      if (!claimed) {
        throw new HttpsError(
          'resource-exhausted',
          'Could not allocate a handle. Please try signing in again.',
        );
      }

      const now = FieldValue.serverTimestamp();
      tx.set(handleRef(claimed), { uid, createdAt: now });
      tx.set(ref, {
        handle: claimed,
        handleLower: claimed,
        displayName,
        photoURL,
        stats: emptyStats,
        score: calculateScore(emptyStats),
        createdAt: now,
        updatedAt: now,
      });
    });

    const saved = await profileRef(uid).get();
    return serializeProfile(saved);
  },
);

/**
 * Claims a normalized handle for the caller.
 *
 * Uniqueness is atomic because the handle *is* the document ID in `handles/`:
 * two concurrent claims of the same handle contend on the same document, so one
 * transaction retries and then fails the existence check.
 */
export const setHandle = defineCallable(
  'setHandle',
  setHandleInput,
  async ({ uid, input }): Promise<PublicProfile> => {
    const nextHandle = input.handle;

    const previousHandle = await db.runTransaction(async (tx) => {
      const ref = profileRef(uid);
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) {
        throw new HttpsError('failed-precondition', 'Your profile has not been set up yet.');
      }

      const currentHandleLower = snapshot.get('handleLower');
      if (currentHandleLower === nextHandle) {
        return null;
      }

      const claim = await tx.get(handleRef(nextHandle));
      if (claim.exists) {
        // Someone else owns it. (Our own current handle was handled above.)
        throw new HttpsError('already-exists', 'That handle is already taken.');
      }

      tx.set(handleRef(nextHandle), { uid, createdAt: FieldValue.serverTimestamp() });
      if (typeof currentHandleLower === 'string' && currentHandleLower.length > 0) {
        tx.delete(handleRef(currentHandleLower));
      }
      tx.update(ref, {
        handle: nextHandle,
        handleLower: nextHandle,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return typeof currentHandleLower === 'string' ? currentHandleLower : null;
    });

    if (previousHandle !== null) {
      // Best-effort: refresh the handle denormalized onto this author's
      // non-anonymous questions and follow edges. Feed rendering reads the
      // denormalized value so a page never needs an extra profile lookup per row;
      // handle changes are rare and rate limited, so the fan-out is affordable.
      await backfillDenormalizedHandle(uid, nextHandle).catch((error) => {
        logger.error('setHandle backfill failed', { uid, nextHandle, error });
      });
    }

    const saved = await profileRef(uid).get();
    return serializeProfile(saved);
  },
  { rateLimit: 'setHandle' },
);

/**
 * Rewrites `authorHandle` on this author's non-anonymous questions, and the
 * `handle` cached on both directions of their follow edges.
 *
 * Anonymous questions are skipped on purpose: they store `authorHandle: null` and
 * must keep storing it.
 */
async function backfillDenormalizedHandle(uid: string, handle: string): Promise<void> {
  const BATCH = 200;

  const authored = await profileRef(uid)
    .collection(subcollections.authored)
    .where('anonymous', '==', false)
    .get();

  for (let index = 0; index < authored.size; index += BATCH) {
    const batch = db.batch();
    for (const doc of authored.docs.slice(index, index + BATCH)) {
      batch.update(questionRef(doc.id), { authorHandle: handle });
    }
    await batch.commit();
  }

  // `profiles/{follower}/following/{uid}` and `profiles/{followed}/followers/{uid}`
  // both cache this account's handle for list rendering.
  const followers = await profileRef(uid).collection(subcollections.followers).get();
  const following = await profileRef(uid).collection(subcollections.following).get();

  const edgeUpdates = [
    ...followers.docs.map((doc) =>
      profileRef(doc.id).collection(subcollections.following).doc(uid),
    ),
    ...following.docs.map((doc) =>
      profileRef(doc.id).collection(subcollections.followers).doc(uid),
    ),
  ];

  for (let index = 0; index < edgeUpdates.length; index += BATCH) {
    const batch = db.batch();
    for (const ref of edgeUpdates.slice(index, index + BATCH)) {
      batch.set(ref, { handle }, { merge: true });
    }
    await batch.commit();
  }
}
