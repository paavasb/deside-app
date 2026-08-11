import { HttpsError } from 'firebase-functions/v2/https';
import { Timestamp } from 'firebase-admin/firestore';
import { RATE_LIMITS, type RateLimitedAction } from '../../../shared/constants';
import { collections, db } from '../firebase';

/**
 * Fixed-window per-account rate limiting.
 *
 * Runs in its own transaction ahead of the main work. That means a quota unit is
 * consumed even if the main work later fails, which is the conservative direction
 * for abuse protection. Counters live in `rateLimits/{uid}_{action}`, which is
 * denied to every client.
 */
export async function enforceRateLimit(uid: string, action: RateLimitedAction): Promise<void> {
  const config = RATE_LIMITS[action];
  const ref = db.collection(collections.rateLimits).doc(`${uid}_${action}`);
  const now = Date.now();

  const retryAfterMs = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    const data = snapshot.data();
    const windowStartedAt =
      data?.windowStartedAt instanceof Timestamp ? data.windowStartedAt.toMillis() : 0;
    const count = typeof data?.count === 'number' ? data.count : 0;

    const windowExpired = now - windowStartedAt >= config.windowMs;

    if (windowExpired) {
      tx.set(ref, {
        action,
        uid,
        count: 1,
        windowStartedAt: Timestamp.fromMillis(now),
      });
      return 0;
    }

    if (count >= config.limit) {
      return windowStartedAt + config.windowMs - now;
    }

    tx.set(ref, {
      action,
      uid,
      count: count + 1,
      windowStartedAt: Timestamp.fromMillis(windowStartedAt),
    });
    return 0;
  });

  if (retryAfterMs > 0) {
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
    throw new HttpsError(
      'resource-exhausted',
      `Too many requests. Try again in ${formatRetryAfter(retryAfterSeconds)}.`,
      { retryAfterSeconds },
    );
  }
}

function formatRetryAfter(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}
