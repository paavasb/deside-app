import { Link, useParams } from 'react-router-dom';
import { EmptyState, ErrorAlert, LoadingRegion } from '@/components/Feedback';
import { useViewerProfile } from '@/hooks/useProfile';
import { useFollowingFlags, useSetFollow } from '@/hooks/useFollow';
import { useProfileByHandle } from '@/hooks/useProfile';
import { formatDate, formatNumber, initialsOf } from '@/lib/format';

/**
 * Another account's public profile.
 *
 * Only the fields `firestore.rules` exposes to any signed-in user are shown: handle,
 * name, avatar, aggregate counters and score. Their follow lists are owner-only, so
 * this page cannot enumerate anyone's social graph — a deliberate change from v1,
 * which shipped the entire user directory to every browser.
 */
export function PublicProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const profile = useProfileByHandle(handle);
  const viewer = useViewerProfile();
  const follow = useSetFollow();

  // A narrowed local, not `profile.data`: TypeScript cannot keep the non-null
  // narrowing of a mutable property alive inside event-handler closures.
  const person = profile.data ?? null;
  const targetUid = person?.uid;
  const flags = useFollowingFlags(targetUid ? [targetUid] : []);
  const isFollowing = targetUid ? (flags.data?.has(targetUid) ?? false) : false;
  const isSelf = Boolean(targetUid && targetUid === viewer.data?.uid);

  return (
    <main className="page" id="main">
      {profile.isPending && <LoadingRegion label="Loading profile…" />}
      {profile.isError && (
        <ErrorAlert error={profile.error} onRetry={() => void profile.refetch()} />
      )}

      {profile.isSuccess && !profile.data && (
        <EmptyState title="No such account" actionLabel="Back to questions" actionTo="/questions">
          There’s no account with the handle “{handle}”.
        </EmptyState>
      )}

      {person && (
        <div className="stack">
          <section className="card stack">
            <div className="profile-header">
              {person.photoURL ? (
                <img
                  className="avatar"
                  src={person.photoURL}
                  alt=""
                  width={64}
                  height={64}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <p className="avatar" aria-hidden="true">
                  {initialsOf(person.displayName, person.handle)}
                </p>
              )}
              <div className="grow">
                <h1 className="page__title">@{person.handle}</h1>
                {person.displayName && <p className="muted">{person.displayName}</p>}
                <p className="text-xs muted">Joined {formatDate(person.createdAt)}</p>
              </div>
              {!isSelf && (
                <button
                  type="button"
                  className={isFollowing ? 'button button--secondary' : 'button'}
                  disabled={follow.isPending || flags.isPending}
                  onClick={() => follow.mutate({ targetUid: person.uid, follow: !isFollowing })}
                >
                  {follow.isPending
                    ? 'Saving…'
                    : isFollowing
                      ? 'Unfollow'
                      : `Follow @${person.handle}`}
                </button>
              )}
            </div>

            {follow.isError && <ErrorAlert error={follow.error} />}

            <div className="stat-grid">
              <div className="stat stat--score">
                <p className="stat__value">{formatNumber(person.score)}</p>
                <p className="stat__label">DeSide Score</p>
              </div>
              <div className="stat">
                <p className="stat__value">{formatNumber(person.stats.questions)}</p>
                <p className="stat__label">Questions</p>
              </div>
              <div className="stat">
                <p className="stat__value">{formatNumber(person.stats.answers)}</p>
                <p className="stat__label">Answers</p>
              </div>
              <div className="stat">
                <p className="stat__value">{formatNumber(person.stats.followers)}</p>
                <p className="stat__label">Followers</p>
              </div>
              <div className="stat">
                <p className="stat__value">{formatNumber(person.stats.following)}</p>
                <p className="stat__label">Following</p>
              </div>
            </div>
          </section>

          <p className="text-s muted">
            {isFollowing
              ? 'You follow this account, so their followers-only questions appear in your feed.'
              : 'Follow this account to see their followers-only questions.'}{' '}
            <Link to="/questions">Go to your feed →</Link>
          </p>
        </div>
      )}
    </main>
  );
}
