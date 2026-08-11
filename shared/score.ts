import { SCORE_WEIGHTS } from './constants';
import type { ProfileStats } from './types';

/**
 * The DeSide Score, preserved from v1.
 *
 * v1 computed this in the browser from fully-downloaded user records. It is now
 * derived from server-maintained counters and stored on the profile, so it can be
 * read without exposing anyone's social graph.
 */
export function calculateScore(stats: ProfileStats): number {
  return (
    stats.questions * SCORE_WEIGHTS.questions +
    stats.answers * SCORE_WEIGHTS.answers +
    stats.followers * SCORE_WEIGHTS.followers +
    stats.following * SCORE_WEIGHTS.following
  );
}

export const emptyStats: ProfileStats = {
  questions: 0,
  answers: 0,
  followers: 0,
  following: 0,
};
