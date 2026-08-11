import { useCallback } from 'react';
import { useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import type { QuestionWithViewerState } from '@shared/types';
import type { FeedPage } from './useFeed';

type QuestionPatch = (question: QuestionWithViewerState) => QuestionWithViewerState;

/**
 * Applies a patch to one question everywhere it is cached.
 *
 * A single question can appear in several caches at once — the public feed, the
 * following feed, "Your questions", and its own detail query. Optimistic updates
 * have to touch all of them or the UI shows two different vote counts for the same
 * question depending on which screen you're on.
 */
function patchQuestion(client: QueryClient, questionId: string, patch: QuestionPatch): void {
  client.setQueriesData<InfiniteData<FeedPage>>({ queryKey: ['feed'] }, (data) => {
    if (!data) return data;
    let changed = false;
    const pages = data.pages.map((page) => {
      if (!page.items.some((item) => item.id === questionId)) return page;
      changed = true;
      return {
        ...page,
        items: page.items.map((item) => (item.id === questionId ? patch(item) : item)),
      };
    });
    return changed ? { ...data, pages } : data;
  });

  client.setQueriesData<InfiniteData<{ items: QuestionWithViewerState[] }>>(
    { queryKey: ['questions', 'mine'] },
    (data) => {
      if (!data) return data;
      let changed = false;
      const pages = data.pages.map((page) => {
        if (!page.items.some((item) => item.id === questionId)) return page;
        changed = true;
        return {
          ...page,
          items: page.items.map((item) => (item.id === questionId ? patch(item) : item)),
        };
      });
      return changed ? { ...data, pages } : data;
    },
  );

  client.setQueryData<QuestionWithViewerState>(['question', questionId], (question) =>
    question ? patch(question) : question,
  );
}

/** Removes a question from every cached list. Used after a delete. */
function dropQuestion(client: QueryClient, questionId: string): void {
  const filter = <T extends { items: QuestionWithViewerState[] }>(
    data: InfiniteData<T> | undefined,
  ) => {
    if (!data) return data;
    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        items: page.items.filter((item) => item.id !== questionId),
      })),
    };
  };

  client.setQueriesData<InfiniteData<FeedPage>>({ queryKey: ['feed'] }, filter);
  client.setQueriesData<InfiniteData<{ items: QuestionWithViewerState[] }>>(
    { queryKey: ['questions', 'mine'] },
    filter,
  );
  client.removeQueries({ queryKey: ['question', questionId] });
}

export function useQuestionCache() {
  const client = useQueryClient();

  return {
    patch: useCallback(
      (questionId: string, patch: QuestionPatch) => patchQuestion(client, questionId, patch),
      [client],
    ),
    drop: useCallback((questionId: string) => dropQuestion(client, questionId), [client]),
    /** Snapshot every cache this hook writes to, so a failed mutation can roll back. */
    snapshot: useCallback(
      () => [
        ...client.getQueriesData({ queryKey: ['feed'] }),
        ...client.getQueriesData({ queryKey: ['questions', 'mine'] }),
        ...client.getQueriesData({ queryKey: ['question'] }),
      ],
      [client],
    ),
    restore: useCallback(
      (entries: ReturnType<QueryClient['getQueriesData']>) => {
        for (const [key, data] of entries) {
          client.setQueryData(key, data);
        }
      },
      [client],
    ),
  };
}
