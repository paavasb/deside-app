import type { ProfileStats } from '../../../shared/types';

/**
 * Applies signed deltas to a profile stats map, clamping each counter at zero.
 *
 * Counters are read-modify-written inside the same transaction as the change they
 * describe, rather than with `FieldValue.increment`, because the DeSide Score is
 * derived from them and has to be written from the same consistent snapshot.
 */
export function nextStats(raw: unknown, delta: Partial<ProfileStats>): ProfileStats {
  const current = (raw ?? {}) as Record<string, unknown>;
  const read = (key: keyof ProfileStats) =>
    typeof current[key] === 'number' && Number.isFinite(current[key]) ? current[key] : 0;
  return {
    questions: Math.max(0, read('questions') + (delta.questions ?? 0)),
    answers: Math.max(0, read('answers') + (delta.answers ?? 0)),
    followers: Math.max(0, read('followers') + (delta.followers ?? 0)),
    following: Math.max(0, read('following') + (delta.following ?? 0)),
  };
}
