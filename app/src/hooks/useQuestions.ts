import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PAGE_SIZE } from '@shared/constants';
import type { Page, QuestionWithViewerState } from '@shared/types';
import { useUid } from '@/auth/useAuth';
import { api } from '@/lib/api';
import { queryKeys, queryScopes } from '@/lib/queryKeys';
import { useQuestionCache } from './useQuestionCache';

/** The caller's own questions, including anonymous and followers-only ones. */
export function useMyQuestions() {
  const uid = useUid();

  return useInfiniteQuery<
    Page<QuestionWithViewerState>,
    Error,
    Page<QuestionWithViewerState>[],
    readonly unknown[],
    string | null
  >({
    queryKey: queryKeys.myQuestions(uid),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    queryFn: ({ pageParam }) => api.listMyQuestions({ cursor: pageParam, limit: PAGE_SIZE }),
    select: (data) => data.pages,
  });
}

/**
 * A single question, including followers-only ones.
 *
 * Always goes through the callable so one code path covers every visibility and the
 * access decision stays on the server.
 */
export function useQuestion(questionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.question(questionId ?? ''),
    queryFn: () => api.getQuestion({ questionId: questionId as string }),
    enabled: Boolean(questionId),
  });
}

export function useCreateQuestion() {
  const client = useQueryClient();
  const uid = useUid();

  return useMutation({
    mutationFn: api.createQuestion,
    onSuccess: async () => {
      // A new question changes the feeds, "Your questions", and the author's stats.
      await Promise.all([
        client.invalidateQueries({ queryKey: queryScopes.feeds }),
        client.invalidateQueries({ queryKey: queryScopes.questions }),
        client.invalidateQueries({ queryKey: queryKeys.viewerProfile(uid) }),
      ]);
    },
  });
}

export function useUpdateQuestion() {
  const client = useQueryClient();
  const cache = useQuestionCache();

  return useMutation({
    mutationFn: api.updateQuestion,
    onSuccess: async (question) => {
      cache.patch(question.id, () => question);
      // Visibility changes move a question between the public and following feeds,
      // so the lists themselves have to be refetched, not just patched in place.
      await client.invalidateQueries({ queryKey: queryScopes.feeds });
    },
  });
}

export function useDeleteQuestion() {
  const client = useQueryClient();
  const uid = useUid();
  const cache = useQuestionCache();

  return useMutation({
    mutationFn: api.deleteQuestion,
    onMutate: ({ questionId }) => {
      const previous = cache.snapshot();
      cache.drop(questionId);
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) cache.restore(context.previous);
    },
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: queryScopes.feeds }),
        client.invalidateQueries({ queryKey: queryScopes.questions }),
        client.invalidateQueries({ queryKey: queryKeys.viewerProfile(uid) }),
      ]);
    },
  });
}

export function useReportQuestion() {
  return useMutation({ mutationFn: api.reportQuestion });
}
