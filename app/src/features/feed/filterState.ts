import type { FeedSource } from '@/hooks/useFeed';

/**
 * Feed filter state, kept separate from the `FeedFilters` component so that module
 * exports only a component and Vite's fast refresh keeps working.
 */

export type AnsweredFilter = 'all' | 'answered' | 'unanswered';
export type SortOption = 'relevant' | 'newest' | 'votes';

export interface FeedFilterState {
  source: FeedSource;
  search: string;
  tags: string[];
  answered: AnsweredFilter;
  sort: SortOption;
  /** `<input type="date">` values, i.e. `YYYY-MM-DD` or empty. */
  startDate: string;
  endDate: string;
}

export const defaultFeedFilters: FeedFilterState = {
  source: 'all',
  search: '',
  tags: [],
  answered: 'all',
  sort: 'relevant',
  startDate: '',
  endDate: '',
};
