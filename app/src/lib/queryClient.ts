import { QueryClient } from '@tanstack/react-query';
import { AppError } from './appError';

/** Errors where retrying cannot possibly help. */
const TERMINAL_CODES = new Set([
  'permission-denied',
  'unauthenticated',
  'not-found',
  'invalid-argument',
  'already-exists',
  'failed-precondition',
  'rate-limited',
]);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof AppError && TERMINAL_CODES.has(error.code)) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      // Mutations are not idempotent (a vote, a follow), so never auto-retry them.
      retry: false,
    },
  },
});
