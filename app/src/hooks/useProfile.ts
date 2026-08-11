import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth, useUid } from '@/auth/useAuth';
import { api } from '@/lib/api';
import {
  fetchFollowEdges,
  fetchProfile,
  fetchProfileByHandle,
  isHandleAvailable,
  searchProfiles,
} from '@/lib/firestore';
import { queryKeys, queryScopes } from '@/lib/queryKeys';

/**
 * The signed-in user's profile.
 *
 * `ensureProfile` both bootstraps a brand-new account (creating the profile and
 * atomically claiming a handle) and returns the current profile, so there is one
 * code path for "first sign-in" and "every later sign-in".
 */
export function useViewerProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.viewerProfile(user?.uid ?? ''),
    enabled: Boolean(user),
    // The profile gates the whole app shell, so keep it fresh but not chatty.
    staleTime: 60_000,
    queryFn: () =>
      api.ensureProfile({
        displayName: user?.displayName ?? null,
        photoURL: user?.photoURL ?? null,
      }),
  });
}

export function useProfile(uid: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profile(uid ?? ''),
    queryFn: () => fetchProfile(uid as string),
    enabled: Boolean(uid),
  });
}

export function useProfileByHandle(handle: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profileByHandle(handle ?? ''),
    queryFn: () => fetchProfileByHandle(handle as string),
    enabled: Boolean(handle),
  });
}

/** Availability hint for the handle form. The claim itself is still atomic server-side. */
export function useHandleAvailability(normalizedHandle: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.handleAvailability(normalizedHandle),
    queryFn: () => isHandleAvailable(normalizedHandle),
    enabled: enabled && normalizedHandle.length > 0,
    staleTime: 10_000,
  });
}

export function useProfileSearch(term: string) {
  const trimmed = term.trim().toLowerCase();
  return useQuery({
    queryKey: queryKeys.profileSearch(trimmed),
    queryFn: () => searchProfiles(trimmed),
    enabled: trimmed.length >= 2,
    staleTime: 30_000,
  });
}

export function useSetHandle() {
  const client = useQueryClient();
  const uid = useUid();

  return useMutation({
    mutationFn: api.setHandle,
    onSuccess: async (profile) => {
      client.setQueryData(queryKeys.viewerProfile(uid), profile);
      // The handle is denormalized onto questions and follow edges, so refresh the
      // lists that render it.
      await Promise.all([
        client.invalidateQueries({ queryKey: queryScopes.feeds }),
        client.invalidateQueries({ queryKey: queryScopes.questions }),
        client.invalidateQueries({ queryKey: queryScopes.follows }),
      ]);
    },
  });
}

export function useFollowEdges(direction: 'following' | 'followers') {
  const uid = useUid();
  return useQuery({
    queryKey: queryKeys.followEdges(uid, direction),
    queryFn: () => fetchFollowEdges(uid, direction),
  });
}
