import { useId } from 'react';
import { TagEditor } from '@/components/TagEditor';
import type { FeedSource } from '@/hooks/useFeed';
import type { AnsweredFilter, FeedFilterState, SortOption } from './filterState';
import { defaultFeedFilters } from './filterState';

interface FeedFiltersProps {
  value: FeedFilterState;
  onChange: (next: FeedFilterState) => void;
  /** Number of questions currently loaded, used to explain client-side filtering. */
  loadedCount: number;
}

export function FeedFilters({ value, onChange, loadedCount }: FeedFiltersProps) {
  const ids = {
    source: useId(),
    search: useId(),
    answered: useId(),
    sort: useId(),
    start: useId(),
    end: useId(),
  };

  const set = <K extends keyof FeedFilterState>(key: K, next: FeedFilterState[K]) =>
    onChange({ ...value, [key]: next });

  const hasDateRange = Boolean(value.startDate || value.endDate);
  // Only the public-only view can sort by votes in the database. The other two merge
  // or wrap a callable that reads newest-first, so votes is a client-side re-rank.
  const clientSideSort =
    value.sort === 'relevant' ||
    (value.sort === 'votes' && (hasDateRange || value.source !== 'public'));
  // The following feed is served by a callable that takes no date bounds, so a range
  // there is applied to the loaded questions rather than by the database.
  const clientSideFilter =
    value.search.trim().length > 0 ||
    value.answered !== 'all' ||
    (value.source !== 'public' && hasDateRange);

  return (
    <section className="filters" aria-label="Filter questions">
      <div className="filters__row">
        <div className="field">
          <label className="field__label" htmlFor={ids.source}>
            Show
          </label>
          <select
            id={ids.source}
            className="select"
            value={value.source}
            onChange={(event) => set('source', event.target.value as FeedSource)}
          >
            <option value="all">Everything I can see</option>
            <option value="public">Public questions only</option>
            <option value="following">From people I follow</option>
          </select>
        </div>

        <div className="field">
          <label className="field__label" htmlFor={ids.answered}>
            Status
          </label>
          <select
            id={ids.answered}
            className="select"
            value={value.answered}
            onChange={(event) => set('answered', event.target.value as AnsweredFilter)}
          >
            <option value="all">All</option>
            <option value="unanswered">Not answered yet</option>
            <option value="answered">Already answered</option>
          </select>
        </div>

        <div className="field">
          <label className="field__label" htmlFor={ids.sort}>
            Order by
          </label>
          <select
            id={ids.sort}
            className="select"
            value={value.sort}
            onChange={(event) => set('sort', event.target.value as SortOption)}
          >
            <option value="relevant">Relevance</option>
            <option value="newest">Newest</option>
            <option value="votes">Most voted</option>
          </select>
        </div>
      </div>

      <div className="filters__row">
        <div className="field">
          <label className="field__label" htmlFor={ids.search}>
            Search titles
          </label>
          <input
            id={ids.search}
            className="input"
            type="search"
            placeholder="Search loaded questions"
            value={value.search}
            onChange={(event) => set('search', event.target.value)}
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor={ids.start}>
            From
          </label>
          <input
            id={ids.start}
            className="input"
            type="date"
            value={value.startDate}
            max={value.endDate || undefined}
            onChange={(event) => set('startDate', event.target.value)}
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor={ids.end}>
            To
          </label>
          <input
            id={ids.end}
            className="input"
            type="date"
            value={value.endDate}
            min={value.startDate || undefined}
            onChange={(event) => set('endDate', event.target.value)}
          />
        </div>
      </div>

      <TagEditor
        label="Tags"
        value={value.tags}
        onChange={(tags) => set('tags', tags)}
        hint="Matches questions carrying any of these tags. Applied by the database."
      />

      {/*
        These notes are deliberate. Firestore has no substring search, and a
        `createdAt` range forces `createdAt` to be the primary sort — so some
        controls can only act on what's already been loaded. Saying so beats
        looking broken.
      */}
      {(clientSideSort || clientSideFilter) && (
        <p className="filters__note">
          {clientSideFilter && (
            <>
              Title search, answered status
              {value.source !== 'public' && hasDateRange ? ' and the date range' : ''} apply to the{' '}
              {loadedCount} question{loadedCount === 1 ? '' : 's'} loaded so far — load more to
              widen the search.{' '}
            </>
          )}
          {clientSideSort &&
            (value.sort === 'relevant'
              ? 'Relevance ordering is applied to the loaded questions.'
              : 'Here “most voted” re-orders the loaded questions.')}
        </p>
      )}

      <div className="row">
        <button
          type="button"
          className="button button--ghost"
          onClick={() => onChange({ ...defaultFeedFilters, source: value.source })}
        >
          Reset filters
        </button>
      </div>
    </section>
  );
}
