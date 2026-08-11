import { describe, expect, it } from 'vitest';
import type { QuestionWithViewerState } from '@shared/types';
import { relevanceScore, sortByNewest, sortByRelevance, sortByVotes } from './rank';

const NOW = Date.UTC(2026, 0, 15);
const DAY = 24 * 60 * 60 * 1000;

function question(overrides: Partial<QuestionWithViewerState> = {}): QuestionWithViewerState {
  return {
    id: 'q1',
    title: 'A question',
    options: [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
    ],
    optionVotes: { a: 0, b: 0 },
    totalVotes: 0,
    tags: [],
    visibility: 'public',
    anonymous: false,
    status: 'active',
    authorId: 'author',
    authorHandle: 'author',
    createdAt: NOW - DAY,
    updatedAt: NOW - DAY,
    viewerOptionId: null,
    viewerIsAuthor: false,
    ...overrides,
  };
}

describe('relevanceScore', () => {
  it('ranks a newer question above an older one, all else equal', () => {
    const fresh = question({ id: 'fresh', createdAt: NOW - DAY });
    const stale = question({ id: 'stale', createdAt: NOW - 200 * DAY });
    expect(relevanceScore(fresh, NOW)).toBeGreaterThan(relevanceScore(stale, NOW));
  });

  it('ranks an unanswered question above one the viewer already answered', () => {
    const unanswered = question({ id: 'u', viewerOptionId: null });
    const answered = question({ id: 'a', viewerOptionId: 'a' });
    expect(relevanceScore(unanswered, NOW)).toBeGreaterThan(relevanceScore(answered, NOW));
  });

  it('rewards more votes but with diminishing returns', () => {
    const quiet = question({ totalVotes: 0 });
    const busy = question({ totalVotes: 50 });
    const viral = question({ totalVotes: 5000 });

    expect(relevanceScore(busy, NOW)).toBeGreaterThan(relevanceScore(quiet, NOW));
    // The damping keeps a runaway question from swamping everything else.
    const firstJump = relevanceScore(busy, NOW) - relevanceScore(quiet, NOW);
    const secondJump = relevanceScore(viral, NOW) - relevanceScore(busy, NOW);
    expect(secondJump).toBeLessThan(firstJump);
  });
});

describe('sortByRelevance', () => {
  it('is a stable total order regardless of input order', () => {
    // v1's comparator mutated a running score across comparisons, so results depended
    // on the input order. This asserts the replacement is order-independent.
    const items = [
      question({ id: 'a', createdAt: NOW - DAY, totalVotes: 3 }),
      question({ id: 'b', createdAt: NOW - 2 * DAY, totalVotes: 40 }),
      question({ id: 'c', createdAt: NOW - 30 * DAY, totalVotes: 1, viewerOptionId: 'a' }),
      question({ id: 'd', createdAt: NOW - 5 * DAY, totalVotes: 12 }),
    ];

    const forward = sortByRelevance(items, NOW).map((item) => item.id);
    const reversed = sortByRelevance([...items].reverse(), NOW).map((item) => item.id);
    expect(reversed).toEqual(forward);
  });

  it('does not mutate its input', () => {
    const items = [question({ id: 'a' }), question({ id: 'b', createdAt: NOW - 90 * DAY })];
    const before = items.map((item) => item.id);
    sortByRelevance(items, NOW);
    expect(items.map((item) => item.id)).toEqual(before);
  });

  it('puts an already-answered old question last', () => {
    const items = [
      question({ id: 'answered', createdAt: NOW - 60 * DAY, viewerOptionId: 'a' }),
      question({ id: 'fresh', createdAt: NOW - DAY }),
    ];
    expect(sortByRelevance(items, NOW).map((item) => item.id)).toEqual(['fresh', 'answered']);
  });
});

describe('sortByVotes', () => {
  it('orders by vote count, breaking ties by recency then ID', () => {
    const items = [
      question({ id: 'b', totalVotes: 5, createdAt: NOW - 2 * DAY }),
      question({ id: 'a', totalVotes: 5, createdAt: NOW - 2 * DAY }),
      question({ id: 'c', totalVotes: 9 }),
      question({ id: 'd', totalVotes: 5, createdAt: NOW - DAY }),
    ];
    expect(sortByVotes(items).map((item) => item.id)).toEqual(['c', 'd', 'a', 'b']);
  });
});

describe('sortByNewest', () => {
  it('orders by createdAt descending', () => {
    const items = [
      question({ id: 'old', createdAt: NOW - 10 * DAY }),
      question({ id: 'new', createdAt: NOW - DAY }),
      question({ id: 'mid', createdAt: NOW - 5 * DAY }),
    ];
    expect(sortByNewest(items).map((item) => item.id)).toEqual(['new', 'mid', 'old']);
  });
});
