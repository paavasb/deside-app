import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUid } from '@/auth/useAuth';
import { api } from '@/lib/api';
import { fetchFollowingFlags } from '@/lib/firestore';
import { queryKeys, queryScopes } from '@/lib/queryKeys';

/** Whether the viewer follows each of the given accounts. */
export function useFollowingFlags(targetUids: readonly string[]) {
  const uid = useUid();
  const targets = [...new Set(targetUids.filter(Boolean))].sort();

  return useQuery({
    queryKey: queryKeys.followingFlags(uid, targets),
    queryFn: () => fetchFollowingFlags(uid, targets),
    enabled: targets.length > 0,
    staleTime: 60_000,
  });
}

/**
 * Follows or unfollows an account.
 *
 * The follow graph decides what the following feed contains, so a change has to
 * invalidate the feeds as well as the follow lists and both profiles' counters.
 * The callable is idempotent, so a double-click cannot inflate anyone's counts.
 */
export function useSetFollow() {
  const client = useQueryClient();
  const uid = useUid();

  return useMutation({
    mutationFn: api.setFollow,
    onSuccess: async (_result, { targetUid }) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: queryScopes.follows }),
        client.invalidateQueries({ queryKey: queryScopes.feeds }),
        client.invalidateQueries({ queryKey: queryKeys.viewerProfile(uid) }),
        client.invalidateQueries({ queryKey: queryKeys.profile(targetUid) }),
      ]);
    },
  });
}
