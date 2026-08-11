import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { HANDLE_MAX, HANDLE_MIN } from '@shared/constants';
import { isValidHandle, normalizeHandle } from '@shared/handle';
import type { FollowEdge, PublicProfile } from '@shared/types';
import { ErrorAlert, LoadingRegion, SuccessAlert } from '@/components/Feedback';
import { useAuth } from '@/auth/useAuth';
import { useSetFollow } from '@/hooks/useFollow';
import {
  useFollowEdges,
  useHandleAvailability,
  useProfileSearch,
  useSetHandle,
  useViewerProfile,
} from '@/hooks/useProfile';
import { formatNumber, initialsOf } from '@/lib/format';

export function ProfilePage() {
  const { user } = useAuth();
  const profile = useViewerProfile();

  return (
    <main className="page" id="main">
      <header className="page__header">
        <h1 className="page__title">Your profile</h1>
      </header>

      {profile.isPending && <LoadingRegion label="Loading your profile…" />}
      {profile.isError && (
        <ErrorAlert error={profile.error} onRetry={() => void profile.refetch()} />
      )}

      {profile.data && (
        <div className="stack">
          <section className="card stack">
            <div className="profile-header">
              {user?.photoURL ? (
                <img
                  className="avatar"
                  src={user.photoURL}
                  alt=""
                  width={64}
                  height={64}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <p className="avatar" aria-hidden="true">
                  {initialsOf(profile.data.displayName, profile.data.handle)}
                </p>
              )}
              <div>
                <h2>{profile.data.displayName ?? 'DeSide user'}</h2>
                <p className="muted">@{profile.data.handle}</p>
              </div>
            </div>

            <div className="stat-grid">
              <div className="stat stat--score">
                <p className="stat__value">{formatNumber(profile.data.score)}</p>
                <p className="stat__label">DeSide Score</p>
              </div>
              <Stat label="Questions" value={profile.data.stats.questions} />
              <Stat label="Answers" value={profile.data.stats.answers} />
              <Stat label="Followers" value={profile.data.stats.followers} />
              <Stat label="Following" value={profile.data.stats.following} />
            </div>
            <p className="field__hint">
              Your score grows as you ask, answer, follow and gain followers.
            </p>
          </section>

          <HandleForm current={profile.data} />
          <FindPeople />
          <FollowList direction="following" />
          <FollowList direction="followers" />
        </div>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <p className="stat__value">{formatNumber(value)}</p>
      <p className="stat__label">{label}</p>
    </div>
  );
}

/**
 * Handle editor.
 *
 * The availability check is only a hint — the actual claim is a transaction on
 * `handles/{normalizedHandle}`, so two people racing for the same handle can never
 * both win, regardless of what this said a moment earlier.
 */
function HandleForm({ current }: { current: PublicProfile }) {
  const setHandle = useSetHandle();
  const [draft, setDraft] = useState(current.handle);

  const normalized = normalizeHandle(draft);
  const changed = normalized !== normalizeHandle(current.handle);
  const valid = isValidHandle(draft);

  const availability = useHandleAvailability(normalized, valid && changed);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid || !changed) return;
    setHandle.mutate({ handle: normalized });
  };

  return (
    <section className="card stack" aria-labelledby="handle-heading">
      <h2 id="handle-heading">Your handle</h2>
      <form className="stack stack--tight" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label className="field__label" htmlFor="handle">
            Handle
          </label>
          <input
            id="handle"
            className="input"
            value={draft}
            maxLength={HANDLE_MAX}
            autoComplete="off"
            aria-invalid={draft.length > 0 && !valid ? 'true' : undefined}
            aria-describedby="handle-hint"
            onChange={(event) => setDraft(event.target.value)}
          />
          <p className="field__hint" id="handle-hint">
            {HANDLE_MIN}–{HANDLE_MAX} characters. Lowercase letters, numbers and underscores.
          </p>
          {draft.length > 0 && !valid && (
            <p className="field__error" role="alert">
              That handle isn’t valid.
            </p>
          )}
          {valid && changed && availability.data === false && (
            <p className="field__error" role="alert">
              @{normalized} is already taken.
            </p>
          )}
          {valid && changed && availability.data === true && (
            <p className="field__hint" style={{ color: 'var(--success)' }}>
              @{normalized} is available.
            </p>
          )}
        </div>

        {setHandle.isError && <ErrorAlert error={setHandle.error} />}
        {setHandle.isSuccess && !changed && <SuccessAlert>Handle updated.</SuccessAlert>}

        <div className="row">
          <button
            type="submit"
            className="button"
            disabled={!valid || !changed || setHandle.isPending || availability.data === false}
          >
            {setHandle.isPending ? 'Saving…' : 'Save handle'}
          </button>
          {changed && (
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setDraft(current.handle)}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

function FindPeople() {
  const [term, setTerm] = useState('');
  const results = useProfileSearch(term);
  const follow = useSetFollow();
  const viewer = useViewerProfile();

  return (
    <section className="card stack" aria-labelledby="find-heading">
      <h2 id="find-heading">Find people</h2>
      <div className="field">
        <label className="field__label" htmlFor="people-search">
          Search by handle
        </label>
        <input
          id="people-search"
          className="input"
          type="search"
          value={term}
          placeholder="Start typing a handle…"
          autoComplete="off"
          onChange={(event) => setTerm(event.target.value)}
        />
        <p className="field__hint">Handle prefix search — Firestore can’t do substring matching.</p>
      </div>

      {results.isFetching && <LoadingRegion label="Searching…" />}
      {results.isError && <ErrorAlert error={results.error} />}

      {results.data && results.data.length === 0 && term.trim().length >= 2 && (
        <p className="muted text-s">No accounts start with “{term.trim()}”.</p>
      )}

      {results.data && results.data.length > 0 && (
        <ul className="stack stack--tight">
          {results.data
            .filter((found) => found.uid !== viewer.data?.uid)
            .map((found) => (
              <li key={found.uid} className="person">
                <p className="avatar avatar--small" aria-hidden="true">
                  {initialsOf(found.displayName, found.handle)}
                </p>
                <div>
                  <p className="person__name">@{found.handle}</p>
                  <p className="person__meta">
                    {formatNumber(found.score)} pts · {formatNumber(found.stats.followers)}{' '}
                    followers
                  </p>
                </div>
                <div className="person__actions">
                  <Link className="button button--ghost" to={`/u/${found.handle}`}>
                    View
                  </Link>
                  <button
                    type="button"
                    className="button button--secondary"
                    disabled={follow.isPending}
                    onClick={() => follow.mutate({ targetUid: found.uid, follow: true })}
                  >
                    Follow
                  </button>
                </div>
              </li>
            ))}
        </ul>
      )}
      {follow.isError && <ErrorAlert error={follow.error} />}
    </section>
  );
}

function FollowList({ direction }: { direction: 'following' | 'followers' }) {
  const edges = useFollowEdges(direction);
  const follow = useSetFollow();
  const [expanded, setExpanded] = useState(false);

  const heading = direction === 'following' ? 'Following' : 'Followers';
  const count = edges.data?.length ?? 0;

  return (
    <section className="card stack" aria-labelledby={`${direction}-heading`}>
      <div className="row row--between">
        <h2 id={`${direction}-heading`}>
          {heading} {edges.data ? `(${formatNumber(count)})` : ''}
        </h2>
        <button
          type="button"
          className="button button--ghost"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
        >
          {expanded ? 'Hide' : 'Show'}
        </button>
      </div>

      {expanded && (
        <>
          {edges.isPending && <LoadingRegion label={`Loading ${heading.toLowerCase()}…`} />}
          {edges.isError && <ErrorAlert error={edges.error} />}
          {edges.data?.length === 0 && (
            <p className="muted text-s">
              {direction === 'following' ? 'You’re not following anyone yet.' : 'No followers yet.'}
            </p>
          )}
          {edges.data && edges.data.length > 0 && (
            <ul className="stack stack--tight">
              {edges.data.map((edge) => (
                <PersonRow
                  key={edge.uid}
                  edge={edge}
                  direction={direction}
                  busy={follow.isPending}
                  onToggle={(follows) => follow.mutate({ targetUid: edge.uid, follow: follows })}
                />
              ))}
            </ul>
          )}
          {follow.isError && <ErrorAlert error={follow.error} />}
        </>
      )}
    </section>
  );
}

function PersonRow({
  edge,
  direction,
  busy,
  onToggle,
}: {
  edge: FollowEdge;
  direction: 'following' | 'followers';
  busy: boolean;
  onToggle: (follow: boolean) => void;
}) {
  return (
    <li className="person">
      <p className="avatar avatar--small" aria-hidden="true">
        {initialsOf(null, edge.handle)}
      </p>
      <div>
        <p className="person__name">@{edge.handle}</p>
      </div>
      <div className="person__actions">
        <Link className="button button--ghost" to={`/u/${edge.handle}`}>
          View
        </Link>
        {direction === 'following' ? (
          <button
            type="button"
            className="button button--secondary"
            disabled={busy}
            onClick={() => onToggle(false)}
          >
            Unfollow
          </button>
        ) : (
          <button
            type="button"
            className="button button--secondary"
            disabled={busy}
            onClick={() => onToggle(true)}
          >
            Follow back
          </button>
        )}
      </div>
    </li>
  );
}
