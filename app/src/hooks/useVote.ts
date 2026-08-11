import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useUid } from '@/auth/useAuth';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useQuestionCache } from './useQuestionCache';

/**
 * Casts a vote with an optimistic update and a real rollback.
 *
 * The bars move the instant you click. If the server rejects the vote — you already
 * voted from another tab, the question closed, you lost access — every cache this
 * touched is restored from the pre-mutation snapshot, so the UI never keeps a vote
 * the server refused. On success the authoritative tallies from the transaction
 * replace the optimistic guess, which also picks up concurrent votes.
 */
export function useVote() {
  const client = useQueryClient();
  const uid = useUid();
  const cache = useQuestionCache();

  return useMutation({
    mutationFn: api.castVote,
    onMutate: ({ questionId, optionId }) => {
      const previous = cache.snapshot();

      cache.patch(questionId, (question) => {
        // Guard against double-submission racing the optimistic patch itself.
        if (question.viewerOptionId !== null) return question;
        return {
          ...question,
          viewerOptionId: optionId,
          totalVotes: question.totalVotes + 1,
          optionVotes: {
            ...question.optionVotes,
            [optionId]: (question.optionVotes[optionId] ?? 0) + 1,
          },
        };
      });

      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) cache.restore(context.previous);
    },
    onSuccess: (question) => {
      cache.patch(question.id, () => question);
    },
    onSettled: async () => {
      // Voting bumps the voter's answer count and DeSide Score.
      await client.invalidateQueries({ queryKey: queryKeys.viewerProfile(uid) });
    },
    // The feeds are deliberately NOT invalidated: a refetch would reshuffle the list
    // under the user the moment they clicked. The patched tallies are the server's
    // own committed numbers, so the visible state is already correct.
  });
}
