import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { QuestionWithViewerState } from '@shared/types';
import { EmptyState, ErrorAlert, LoadingRegion, QuestionSkeletons } from '@/components/Feedback';
import { QuestionCard } from '@/components/QuestionCard';
import { FeedFilters } from '@/features/feed/FeedFilters';
import { defaultFeedFilters, type FeedFilterState } from '@/features/feed/filterState';
import { sortByNewest, sortByRelevance, sortByVotes } from '@/features/feed/rank';
import { useFeed } from '@/hooks/useFeed';
import { useFollowingFlags } from '@/hooks/useFollow';
import { dateInputToMillis } from '@/lib/format';

export function QuestionsPage() {
  const [filters, setFilters] = useState<FeedFilterState>(defaultFeedFilters);

  // Only the constraints Firestore can actually enforce belong in the query key;
  // everything else is applied to the loaded pages below.
  const serverFilters = useMemo(
    () => ({
      tags: filters.tags,
      sort: filters.sort === 'votes' ? ('votes' as const) : ('newest' as const),
      startDate: dateInputToMillis(filters.startDate),
      endDate: dateInputToMillis(filters.endDate, true),
    }),
    [filters.tags, filters.sort, filters.startDate, filters.endDate],
  );

  const feed = useFeed(filters.source, serverFilters);

  const loaded = useMemo<QuestionWithViewerState[]>(
    () => (feed.data ?? []).flatMap((page) => page.items),
    [feed.data],
  );

  const visible = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    // The followers-only half of the feed comes from a callable that takes no date
    // bounds, so any mode that includes it applies the range here — otherwise the
    // control would silently do nothing for those questions.
    const applyDatesLocally = filters.source !== 'public';
    const startDate = applyDatesLocally ? serverFilters.startDate : null;
    const endDate = applyDatesLocally ? serverFilters.endDate : null;

    const filtered = loaded.filter((question) => {
      if (search && !question.title.toLowerCase().includes(search)) return false;
      if (filters.answered === 'answered' && question.viewerOptionId === null) return false;
      if (filters.answered === 'unanswered' && question.viewerOptionId !== null) return false;
      if (startDate !== null && question.createdAt < startDate) return false;
      if (endDate !== null && question.createdAt > endDate) return false;
      return true;
    });

    if (filters.sort === 'relevant') return sortByRelevance(filtered);
    if (filters.sort === 'votes') return sortByVotes(filtered);
    return sortByNewest(filtered);
  }, [
    loaded,
    filters.search,
    filters.answered,
    filters.sort,
    filters.source,
    serverFilters.startDate,
    serverFilters.endDate,
  ]);

  // One batched lookup for the authors on screen, so each card knows whether to
  // offer a Follow button without a query per card.
  const authorIds = useMemo(
    () =>
      visible
        .map((question) => question.authorId)
        .filter((id): id is string => typeof id === 'string'),
    [visible],
  );
  const followingFlags = useFollowingFlags(authorIds);

  return (
    <main className="page" id="main">
      <header className="page__header">
        <h1 className="page__title">Answer questions</h1>
        <p className="page__subtitle">
          {filters.source === 'all'
            ? 'Public questions plus followers-only ones from people you follow, newest first.'
            : filters.source === 'public'
              ? 'Every public question on DeSide.'
              : 'Questions from the people you follow.'}{' '}
          <Link to="/add">Ask your own question →</Link>
        </p>
      </header>

      <FeedFilters value={filters} onChange={setFilters} loadedCount={loaded.length} />

      {feed.isPending && <QuestionSkeletons />}

      {feed.isError && <ErrorAlert error={feed.error} onRetry={() => void feed.refetch()} />}

      {feed.isSuccess && visible.length === 0 && (
        <>
          {filters.source === 'following' && loaded.length === 0 ? (
            <EmptyState
              title="Nothing from people you follow yet"
              actionLabel="Find people to follow"
              actionTo="/user"
            >
              Follow a few accounts and their questions — including followers-only ones — show up
              here.
            </EmptyState>
          ) : loaded.length === 0 ? (
            <EmptyState title="No questions yet" actionLabel="Ask the first one" actionTo="/add">
              Nothing matches these filters. Try widening them.
            </EmptyState>
          ) : (
            <EmptyState title="No matches">
              {loaded.length} question{loaded.length === 1 ? '' : 's'} loaded, but none match your
              search. Try loading more or clearing the filters.
            </EmptyState>
          )}
        </>
      )}

      {visible.length > 0 && (
        <ul className="stack">
          {visible.map((question) => (
            <li key={question.id}>
              <QuestionCard
                question={question}
                isFollowingAuthor={
                  question.authorId ? (followingFlags.data?.has(question.authorId) ?? false) : false
                }
              />
            </li>
          ))}
        </ul>
      )}

      {feed.hasNextPage && (
        <p className="center" style={{ marginTop: 'var(--space-m)' }}>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => void feed.fetchNextPage()}
            disabled={feed.isFetchingNextPage}
          >
            {feed.isFetchingNextPage ? 'Loading…' : 'Load more questions'}
          </button>
        </p>
      )}

      {feed.isFetching && !feed.isPending && !feed.isFetchingNextPage && (
        <LoadingRegion label="Refreshing…" />
      )}
    </main>
  );
}
