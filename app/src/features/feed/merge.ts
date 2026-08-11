/**
 * Ordered merge of several independently-paginated, descending-ordered sources.
 *
 * The merged feed reads public questions straight from Firestore and followers-only
 * questions from a callable. Those are two separate paginated streams, so naively
 * concatenating a page from each breaks ordering across page boundaries: if every
 * public question is newer than every followers-only one, page 2's public items would
 * be newer than page 1's followers-only items.
 *
 * The fix is a k-way merge with lookahead. An item is only emitted once it is known to
 * be greater than or equal to anything either stream could still produce — which,
 * because each stream is itself ordered descending, means comparing the stream heads.
 * Whatever was fetched but not emitted is carried into the next page as a buffer.
 */

export interface MergeSource<T> {
  /** Fetched but not yet emitted, in descending key order. */
  buffer: T[];
  /** True once the underlying stream has no more pages. */
  exhausted: boolean;
  /** Fetches the next page of the underlying stream. */
  fetchMore: () => Promise<{ items: T[]; exhausted: boolean }>;
}

interface MergeOptions<T> {
  sources: MergeSource<T>[];
  /** How many items to emit. */
  count: number;
  /** Sort key; higher sorts first. */
  key: (item: T) => number;
  /** Stable identity, used to drop anything already emitted. */
  id: (item: T) => string;
  /**
   * IDs already emitted in earlier pages. Mutated as items are emitted.
   *
   * A question that changes visibility mid-pagination could otherwise surface in both
   * streams, and a duplicate row with a duplicate React key is worse than a gap.
   */
  seen: Set<string>;
  /**
   * Cap on fetches per call. A source can legitimately return an empty page while
   * still having more (the following feed filters tags after its query), so an empty
   * page means "keep going", not "done" — this stops that from looping forever.
   */
  maxFetches?: number;
}

/**
 * Emits up to `count` items in descending key order.
 *
 * Mutates each source's `buffer` and `exhausted`, so the caller can carry the same
 * source objects into the next page and resume exactly where this left off.
 */
export async function mergeDescending<T>({
  sources,
  count,
  key,
  id,
  seen,
  maxFetches = 12,
}: MergeOptions<T>): Promise<T[]> {
  const emitted: T[] = [];
  let fetches = 0;

  while (emitted.length < count) {
    // Refill every empty stream that might still have items. This has to happen
    // before comparing heads, or a stream with an empty buffer would be skipped and
    // its items would arrive out of order on a later page.
    const needsRefill = sources.filter((source) => source.buffer.length === 0 && !source.exhausted);

    if (needsRefill.length > 0) {
      if (fetches >= maxFetches) break;
      fetches += needsRefill.length;
      await Promise.all(
        needsRefill.map(async (source) => {
          const page = await source.fetchMore();
          source.buffer.push(...page.items);
          source.exhausted = page.exhausted;
        }),
      );
      // Re-evaluate: a refill may have produced nothing while reporting more pages.
      continue;
    }

    const ready = sources.filter((source) => source.buffer.length > 0);
    if (ready.length === 0) break;

    let best = ready[0]!;
    for (const source of ready) {
      if (key(source.buffer[0]!) > key(best.buffer[0]!)) best = source;
    }

    const item = best.buffer.shift()!;
    const itemId = id(item);
    if (seen.has(itemId)) continue;
    seen.add(itemId);
    emitted.push(item);
  }

  return emitted;
}

/** True while any source could still yield an item. */
export function hasMoreItems<T>(sources: readonly MergeSource<T>[]): boolean {
  return sources.some((source) => source.buffer.length > 0 || !source.exhausted);
}
