import type { PublicFeedFilters } from './firestore';

/**
 * Centralised React Query keys.
 *
 * Keeping them in one place is what makes targeted invalidation after a mutation
 * reliable — e.g. casting a vote invalidates the feeds and the viewer's profile,
 * and nothing else.
 */
export const queryKeys = {
  viewerProfile: (uid: string) => ['profile', 'viewer', uid] as const,
  profile: (uid: string) => ['profile', uid] as const,
  profileByHandle: (handle: string) => ['profile', 'handle', handle] as const,
  handleAvailability: (handle: string) => ['handle', 'available', handle] as const,
  profileSearch: (term: string) => ['profile', 'search', term] as const,

  /**
   * Keeps the `'feed'` prefix so `useQuestionCache` can patch a question across every
   * cached feed variant with a single `setQueriesData`.
   */
  feed: (uid: string, source: string, filters: PublicFeedFilters) =>
    ['feed', source, uid, filters] as const,
  myQuestions: (uid: string) => ['questions', 'mine', uid] as const,
  question: (questionId: string) => ['question', questionId] as const,

  followEdges: (uid: string, direction: 'following' | 'followers') =>
    ['follows', uid, direction] as const,
  followingFlags: (uid: string, targets: readonly string[]) =>
    ['follows', 'flags', uid, [...targets].sort()] as const,
} as const;

/** Key prefixes used for broad invalidation after a mutation. */
export const queryScopes = {
  feeds: ['feed'] as const,
  questions: ['questions'] as const,
  follows: ['follows'] as const,
  profiles: ['profile'] as const,
} as const;
