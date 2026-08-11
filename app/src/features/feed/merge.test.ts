import { describe, expect, it, vi } from 'vitest';
import { hasMoreItems, mergeDescending, type MergeSource } from './merge';

interface Item {
  id: string;
  createdAt: number;
}

/**
 * Builds a source that serves `pages` one call at a time, reporting exhaustion on the
 * last one — the same contract the real Firestore query and callable expose.
 */
function source(pages: Item[][]): MergeSource<Item> & { calls: number } {
  let index = 0;
  const self = {
    buffer: [] as Item[],
    exhausted: pages.length === 0,
    calls: 0,
    fetchMore: () => {
      self.calls += 1;
      const items = pages[index] ?? [];
      index += 1;
      return Promise.resolve({ items, exhausted: index >= pages.length });
    },
  };
  return self;
}

const merge = (sources: MergeSource<Item>[], count: number, seen = new Set<string>()) =>
  mergeDescending({
    sources,
    count,
    key: (item) => item.createdAt,
    id: (item) => item.id,
    seen,
  });

describe('mergeDescending', () => {
  it('interleaves two streams into one descending order', async () => {
    const a = source([
      [
        { id: 'a1', createdAt: 100 },
        { id: 'a2', createdAt: 80 },
      ],
    ]);
    const b = source([
      [
        { id: 'b1', createdAt: 90 },
        { id: 'b2', createdAt: 70 },
      ],
    ]);

    const items = await merge([a, b], 10);
    expect(items.map((item) => item.id)).toEqual(['a1', 'b1', 'a2', 'b2']);
  });

  it('keeps global order across page boundaries', async () => {
    // The bug this exists to prevent: every item of stream A is newer than every item
    // of stream B. Emitting a page from each and concatenating would put A's *second*
    // page after B's first, i.e. newer items below older ones.
    const a = source([
      [
        { id: 'a1', createdAt: 100 },
        { id: 'a2', createdAt: 99 },
      ],
      [
        { id: 'a3', createdAt: 98 },
        { id: 'a4', createdAt: 97 },
      ],
    ]);
    const b = source([
      [
        { id: 'b1', createdAt: 20 },
        { id: 'b2', createdAt: 19 },
      ],
    ]);

    const seen = new Set<string>();
    const sources = [a, b];

    const page1 = await merge(sources, 2, seen);
    const page2 = await merge(sources, 2, seen);
    const page3 = await merge(sources, 2, seen);

    const all = [...page1, ...page2, ...page3];
    expect(all.map((item) => item.id)).toEqual(['a1', 'a2', 'a3', 'a4', 'b1', 'b2']);

    // Strictly descending overall — the actual invariant.
    const keys = all.map((item) => item.createdAt);
    expect([...keys].sort((x, y) => y - x)).toEqual(keys);
  });

  it('carries un-emitted lookahead into the next page instead of dropping it', async () => {
    const a = source([
      [
        { id: 'a1', createdAt: 100 },
        { id: 'a2', createdAt: 10 },
      ],
    ]);
    const b = source([[{ id: 'b1', createdAt: 50 }]]);

    const seen = new Set<string>();
    const sources = [a, b];

    const page1 = await merge(sources, 1, seen);
    expect(page1.map((item) => item.id)).toEqual(['a1']);
    // a2 was fetched but not emitted, so it must still be buffered.
    expect(a.buffer.map((item) => item.id)).toEqual(['a2']);

    const rest = await merge(sources, 10, seen);
    expect(rest.map((item) => item.id)).toEqual(['b1', 'a2']);
  });

  it('drains the remaining stream once the other is exhausted', async () => {
    const a = source([[{ id: 'a1', createdAt: 100 }]]);
    const b = source([
      [{ id: 'b1', createdAt: 90 }],
      [{ id: 'b2', createdAt: 80 }],
      [{ id: 'b3', createdAt: 70 }],
    ]);

    const items = await merge([a, b], 10);
    expect(items.map((item) => item.id)).toEqual(['a1', 'b1', 'b2', 'b3']);
  });

  it('treats a switched-off stream as a single-source feed', async () => {
    // How the hook serves the public-only and following-only modes.
    const off: MergeSource<Item> = { buffer: [], exhausted: true, fetchMore: vi.fn() };
    const on = source([[{ id: 'x', createdAt: 5 }]]);

    const items = await merge([on, off], 10);
    expect(items.map((item) => item.id)).toEqual(['x']);
    expect(off.fetchMore).not.toHaveBeenCalled();
  });

  it('never emits the same question twice', async () => {
    // A question changing visibility mid-pagination could reach both streams.
    const a = source([
      [
        { id: 'dupe', createdAt: 100 },
        { id: 'a2', createdAt: 60 },
      ],
    ]);
    const b = source([
      [
        { id: 'dupe', createdAt: 100 },
        { id: 'b2', createdAt: 50 },
      ],
    ]);

    const items = await merge([a, b], 10);
    expect(items.map((item) => item.id)).toEqual(['dupe', 'a2', 'b2']);
  });

  it('keeps going past an empty page that reports more to come', async () => {
    // The following callable filters tags after its query, so it can legitimately
    // return zero items while still having a next cursor.
    const a = source([[], [], [{ id: 'late', createdAt: 10 }]]);
    const b = source([[{ id: 'b1', createdAt: 20 }]]);

    const items = await merge([a, b], 10);
    expect(items.map((item) => item.id)).toEqual(['b1', 'late']);
  });

  it('gives up rather than looping forever on an endlessly empty stream', async () => {
    let calls = 0;
    const endless: MergeSource<Item> = {
      buffer: [],
      exhausted: false,
      fetchMore: () => {
        calls += 1;
        return Promise.resolve({ items: [], exhausted: false });
      },
    };

    const items = await merge([endless], 10);
    expect(items).toEqual([]);
    expect(calls).toBeLessThanOrEqual(12);
  });

  it('stops at the requested count', async () => {
    const a = source([Array.from({ length: 30 }, (_, i) => ({ id: `a${i}`, createdAt: 100 - i }))]);
    const items = await merge([a], 5);
    expect(items).toHaveLength(5);
  });

  it('does not fetch at all when both buffers already satisfy the page', async () => {
    const a = source([[{ id: 'later', createdAt: 1 }]]);
    a.buffer = [{ id: 'buffered', createdAt: 100 }];
    const b: MergeSource<Item> = { buffer: [], exhausted: true, fetchMore: vi.fn() };

    const items = await merge([a, b], 1);
    expect(items.map((item) => item.id)).toEqual(['buffered']);
    expect(a.calls).toBe(0);
  });
});

describe('hasMoreItems', () => {
  it('is true while anything is buffered or any stream has pages left', () => {
    expect(
      hasMoreItems([{ buffer: [{ id: 'x', createdAt: 1 }], exhausted: true, fetchMore: vi.fn() }]),
    ).toBe(true);
    expect(hasMoreItems([{ buffer: [], exhausted: false, fetchMore: vi.fn() }])).toBe(true);
  });

  it('is false only when every stream is drained and empty', () => {
    expect(
      hasMoreItems([
        { buffer: [], exhausted: true, fetchMore: vi.fn() },
        { buffer: [], exhausted: true, fetchMore: vi.fn() },
      ]),
    ).toBe(false);
  });
});
