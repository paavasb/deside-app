import type { QuestionWithViewerState } from '@shared/types';

const DAY = 24 * 60 * 60 * 1000;

/**
 * The v1 "relevant" ordering, ported and made deterministic.
 *
 * This cannot be a Firestore `orderBy` — it mixes recency, vote volume and the
 * viewer's own answer state. So pages are fetched newest-first and re-ranked here,
 * over the questions already loaded. The UI says so rather than implying the whole
 * corpus was considered.
 *
 * v1's version compared pairs with a mutable running score, which is not a valid
 * comparator (not transitive, and `Array.sort` results depended on input order).
 * This computes an absolute score per question instead, so the ordering is stable.
 */
export function relevanceScore(question: QuestionWithViewerState, now: number): number {
  let score = 0;

  // Recency: newest questions surface first, tapering off over about a month.
  const ageDays = Math.max(0, (now - question.createdAt) / DAY);
  score += 30 / (1 + ageDays);

  // Vote volume, damped so a runaway question can't dominate the whole feed.
  score += 20 * (question.totalVotes / (question.totalVotes + 10));

  // Unanswered questions are the point of the app, so they rank above answered ones.
  if (question.viewerOptionId === null) score += 18;

  // A question shared specifically with followers is more personal, so slightly up.
  if (question.visibility === 'followers') score += 4;

  // Tagged questions are easier to trust than untagged ones.
  if (question.tags.length > 0) score += 1;

  // Attributed questions edge out anonymous ones, as in v1.
  if (!question.anonymous) score += 0.5;

  return score;
}

/** Sorts a copy by descending relevance, with `createdAt` then ID as tiebreakers. */
export function sortByRelevance(
  questions: readonly QuestionWithViewerState[],
  now: number = Date.now(),
): QuestionWithViewerState[] {
  return [...questions].sort((a, b) => {
    const difference = relevanceScore(b, now) - relevanceScore(a, now);
    if (difference !== 0) return difference;
    if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt;
    return a.id.localeCompare(b.id);
  });
}

export function sortByVotes(
  questions: readonly QuestionWithViewerState[],
): QuestionWithViewerState[] {
  return [...questions].sort((a, b) => {
    if (b.totalVotes !== a.totalVotes) return b.totalVotes - a.totalVotes;
    if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt;
    return a.id.localeCompare(b.id);
  });
}

export function sortByNewest(
  questions: readonly QuestionWithViewerState[],
): QuestionWithViewerState[] {
  return [...questions].sort((a, b) => {
    if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt;
    return a.id.localeCompare(b.id);
  });
}
