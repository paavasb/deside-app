import { beforeEach, describe, expect, it } from 'vitest';
import type { Page, PublicProfile, QuestionWithViewerState } from '../../shared/types';
import {
  callFunction,
  clearAuth,
  clearFirestore,
  createSignedUpUser,
  createUser,
  expectCallableError,
} from '../helpers/emulator';

/**
 * End-to-end tests for the callable functions, run against the Emulator Suite.
 *
 * These cover the behaviours the plan calls out as broken in v1: non-atomic voting,
 * circumventable one-vote-per-account, client-side "privacy", and client-controlled
 * authorization. Each is asserted from the outside, over the real callable protocol.
 */

const publicQuestion = {
  title: 'Should I move to Lisbon?',
  options: ['Yes, go', 'No, stay'],
  tags: ['Life', 'big decisions'],
  visibility: 'public' as const,
  anonymous: false,
};

beforeEach(async () => {
  await clearFirestore();
  await clearAuth();
});

describe('ensureProfile', () => {
  it('requires authentication', async () => {
    const error = await expectCallableError(callFunction('ensureProfile', null, {}));
    expect(error.status).toBe('UNAUTHENTICATED');
  });

  it('creates a profile with a handle on first call and is idempotent after', async () => {
    const user = await createUser('alice');

    const first = await callFunction<PublicProfile>('ensureProfile', user, {});
    expect(first.uid).toBe(user.uid);
    expect(first.handle).toMatch(/^[a-z0-9_]{3,20}$/);
    expect(first.stats).toEqual({ questions: 0, answers: 0, followers: 0, following: 0 });
    expect(first.score).toBe(0);

    const second = await callFunction<PublicProfile>('ensureProfile', user, {});
    expect(second.handle).toBe(first.handle);
    expect(second.createdAt).toBe(first.createdAt);
  });
});

describe('setHandle', () => {
  it('claims a handle and rejects a duplicate claim from another account', async () => {
    const alice = await createSignedUpUser('alice');
    const bob = await createSignedUpUser('bob');

    const updated = await callFunction<PublicProfile>('setHandle', alice, { handle: 'Decider' });
    // Handles are normalized to lowercase before being claimed.
    expect(updated.handle).toBe('decider');

    const error = await expectCallableError(callFunction('setHandle', bob, { handle: 'DECIDER' }));
    expect(error.status).toBe('ALREADY_EXISTS');
  });

  it('rejects invalid handles', async () => {
    const alice = await createSignedUpUser('alice');
    for (const handle of ['ab', 'has spaces', 'has-dash', 'way_too_long_a_handle_here']) {
      const error = await expectCallableError(callFunction('setHandle', alice, { handle }));
      expect(error.status).toBe('INVALID_ARGUMENT');
    }
  });

  it('lets an account re-claim the handle it already owns', async () => {
    const alice = await createSignedUpUser('alice');
    await callFunction('setHandle', alice, { handle: 'decider' });
    const again = await callFunction<PublicProfile>('setHandle', alice, { handle: 'decider' });
    expect(again.handle).toBe('decider');
  });
});

describe('createQuestion', () => {
  it('normalizes tags, assigns option IDs and zeroed counters', async () => {
    const alice = await createSignedUpUser('alice');
    const question = await callFunction<QuestionWithViewerState>(
      'createQuestion',
      alice,
      publicQuestion,
    );

    expect(question.title).toBe(publicQuestion.title);
    // Tags are lowercased and spaces become dashes, matching the query side.
    expect(question.tags).toEqual(['life', 'big-decisions']);
    expect(question.options).toHaveLength(2);
    expect(question.options[0]?.id).toBeTruthy();
    expect(question.totalVotes).toBe(0);
    expect(Object.values(question.optionVotes)).toEqual([0, 0]);
    expect(question.authorId).toBe(alice.uid);
    expect(question.viewerIsAuthor).toBe(true);
  });

  it('stores no author on an anonymous question', async () => {
    const alice = await createSignedUpUser('alice');
    const question = await callFunction<QuestionWithViewerState>('createQuestion', alice, {
      ...publicQuestion,
      anonymous: true,
    });

    expect(question.anonymous).toBe(true);
    expect(question.authorId).toBeNull();
    expect(question.authorHandle).toBeNull();
    // Still the author's own question, from their own perspective.
    expect(question.viewerIsAuthor).toBe(true);
  });

  it('increments the author stats and score', async () => {
    const alice = await createSignedUpUser('alice');
    await callFunction('createQuestion', alice, publicQuestion);
    const profile = await callFunction<PublicProfile>('ensureProfile', alice, {});
    expect(profile.stats.questions).toBe(1);
    // 20 points per question.
    expect(profile.score).toBe(20);
  });

  it('rejects invalid payloads', async () => {
    const alice = await createSignedUpUser('alice');

    const cases: unknown[] = [
      { ...publicQuestion, title: 'no' },
      { ...publicQuestion, options: ['only one'] },
      { ...publicQuestion, options: ['same', 'SAME'] },
      { ...publicQuestion, visibility: 'secret' },
      { ...publicQuestion, options: Array.from({ length: 11 }, (_, i) => `opt ${i}`) },
    ];

    for (const payload of cases) {
      const error = await expectCallableError(callFunction('createQuestion', alice, payload));
      expect(error.status).toBe('INVALID_ARGUMENT');
    }
  });
});

describe('castVote', () => {
  it('records a vote and increments exactly one counter', async () => {
    const alice = await createSignedUpUser('alice');
    const bob = await createSignedUpUser('bob');
    const created = await callFunction<QuestionWithViewerState>(
      'createQuestion',
      alice,
      publicQuestion,
    );
    const chosen = created.options[0]!.id;
    const other = created.options[1]!.id;

    const voted = await callFunction<QuestionWithViewerState>('castVote', bob, {
      questionId: created.id,
      optionId: chosen,
    });

    expect(voted.totalVotes).toBe(1);
    expect(voted.optionVotes[chosen]).toBe(1);
    expect(voted.optionVotes[other]).toBe(0);
    expect(voted.viewerOptionId).toBe(chosen);
  });

  it('rejects a second vote from the same account', async () => {
    const alice = await createSignedUpUser('alice');
    const bob = await createSignedUpUser('bob');
    const created = await callFunction<QuestionWithViewerState>(
      'createQuestion',
      alice,
      publicQuestion,
    );

    await callFunction('castVote', bob, {
      questionId: created.id,
      optionId: created.options[0]!.id,
    });

    // Voting again, even for a different option, must fail.
    const error = await expectCallableError(
      callFunction('castVote', bob, {
        questionId: created.id,
        optionId: created.options[1]!.id,
      }),
    );
    expect(error.status).toBe('ALREADY_EXISTS');
  });

  it('counts concurrent votes from different accounts without losing any', async () => {
    // This is the v1 bug: each browser read the counter, added one, and wrote it
    // back, so simultaneous votes overwrote each other. The transaction must make
    // all of these land.
    const alice = await createSignedUpUser('alice');
    const voters = await Promise.all(
      Array.from({ length: 5 }, (_, index) => createSignedUpUser(`voter${index}`)),
    );
    const created = await callFunction<QuestionWithViewerState>(
      'createQuestion',
      alice,
      publicQuestion,
    );
    const optionId = created.options[0]!.id;

    await Promise.all(
      voters.map((voter) => callFunction('castVote', voter, { questionId: created.id, optionId })),
    );

    const final = await callFunction<QuestionWithViewerState>('getQuestion', alice, {
      questionId: created.id,
    });
    expect(final.totalVotes).toBe(voters.length);
    expect(final.optionVotes[optionId]).toBe(voters.length);
  });

  it('rejects voting on your own question', async () => {
    const alice = await createSignedUpUser('alice');
    const created = await callFunction<QuestionWithViewerState>(
      'createQuestion',
      alice,
      publicQuestion,
    );

    const error = await expectCallableError(
      callFunction('castVote', alice, {
        questionId: created.id,
        optionId: created.options[0]!.id,
      }),
    );
    expect(error.status).toBe('PERMISSION_DENIED');
  });

  it('rejects an option that belongs to a different question', async () => {
    const alice = await createSignedUpUser('alice');
    const bob = await createSignedUpUser('bob');
    const first = await callFunction<QuestionWithViewerState>(
      'createQuestion',
      alice,
      publicQuestion,
    );
    const second = await callFunction<QuestionWithViewerState>('createQuestion', alice, {
      ...publicQuestion,
      title: 'A different question entirely',
    });

    const error = await expectCallableError(
      callFunction('castVote', bob, {
        questionId: first.id,
        optionId: second.options[0]!.id,
      }),
    );
    expect(error.status).toBe('INVALID_ARGUMENT');
  });

  it('rejects a vote on a deleted question', async () => {
    const alice = await createSignedUpUser('alice');
    const bob = await createSignedUpUser('bob');
    const created = await callFunction<QuestionWithViewerState>(
      'createQuestion',
      alice,
      publicQuestion,
    );
    await callFunction('deleteQuestion', alice, { questionId: created.id });

    const error = await expectCallableError(
      callFunction('castVote', bob, {
        questionId: created.id,
        optionId: created.options[0]!.id,
      }),
    );
    expect(['FAILED_PRECONDITION', 'NOT_FOUND']).toContain(error.status);
  });

  it('credits the voter, not the author', async () => {
    const alice = await createSignedUpUser('alice');
    const bob = await createSignedUpUser('bob');
    const created = await callFunction<QuestionWithViewerState>(
      'createQuestion',
      alice,
      publicQuestion,
    );
    await callFunction('castVote', bob, {
      questionId: created.id,
      optionId: created.options[0]!.id,
    });

    const bobProfile = await callFunction<PublicProfile>('ensureProfile', bob, {});
    expect(bobProfile.stats.answers).toBe(1);
    expect(bobProfile.score).toBe(1);

    const aliceProfile = await callFunction<PublicProfile>('ensureProfile', alice, {});
    expect(aliceProfile.stats.answers).toBe(0);
  });
});

describe('followers-only visibility', () => {
  it('is enforced server-side for reads and votes', async () => {
    const author = await createSignedUpUser('author');
    const follower = await createSignedUpUser('follower');
    const stranger = await createSignedUpUser('stranger');

    const created = await callFunction<QuestionWithViewerState>('createQuestion', author, {
      ...publicQuestion,
      visibility: 'followers',
    });

    // A stranger can neither read nor vote.
    const readError = await expectCallableError(
      callFunction('getQuestion', stranger, { questionId: created.id }),
    );
    expect(readError.status).toBe('PERMISSION_DENIED');

    const voteError = await expectCallableError(
      callFunction('castVote', stranger, {
        questionId: created.id,
        optionId: created.options[0]!.id,
      }),
    );
    expect(voteError.status).toBe('PERMISSION_DENIED');

    // After following, the same account can do both.
    await callFunction('setFollow', follower, { targetUid: author.uid, follow: true });

    const visible = await callFunction<QuestionWithViewerState>('getQuestion', follower, {
      questionId: created.id,
    });
    expect(visible.id).toBe(created.id);

    const voted = await callFunction<QuestionWithViewerState>('castVote', follower, {
      questionId: created.id,
      optionId: created.options[0]!.id,
    });
    expect(voted.totalVotes).toBe(1);
  });

  it('revokes access again after unfollowing', async () => {
    const author = await createSignedUpUser('author');
    const follower = await createSignedUpUser('follower');
    const created = await callFunction<QuestionWithViewerState>('createQuestion', author, {
      ...publicQuestion,
      visibility: 'followers',
    });

    await callFunction('setFollow', follower, { targetUid: author.uid, follow: true });
    await callFunction('getQuestion', follower, { questionId: created.id });

    await callFunction('setFollow', follower, { targetUid: author.uid, follow: false });
    const error = await expectCallableError(
      callFunction('getQuestion', follower, { questionId: created.id }),
    );
    expect(error.status).toBe('PERMISSION_DENIED');
  });
});

describe('listFollowingFeed', () => {
  it('returns followed authors’ questions, including followers-only and anonymous ones', async () => {
    const author = await createSignedUpUser('author');
    const follower = await createSignedUpUser('follower');
    const unrelated = await createSignedUpUser('unrelated');

    await callFunction('createQuestion', author, { ...publicQuestion, title: 'Author public' });
    await callFunction('createQuestion', author, {
      ...publicQuestion,
      title: 'Author followers only',
      visibility: 'followers',
    });
    await callFunction('createQuestion', author, {
      ...publicQuestion,
      title: 'Author anonymous',
      anonymous: true,
    });
    await callFunction('createQuestion', unrelated, {
      ...publicQuestion,
      title: 'Someone else entirely',
    });

    // Before following, the feed is empty.
    const before = await callFunction<Page<QuestionWithViewerState>>(
      'listFollowingFeed',
      follower,
      {},
    );
    expect(before.items).toEqual([]);

    await callFunction('setFollow', follower, { targetUid: author.uid, follow: true });

    const after = await callFunction<Page<QuestionWithViewerState>>(
      'listFollowingFeed',
      follower,
      {},
    );
    const titles = after.items.map((item) => item.title).sort();
    expect(titles).toEqual(['Author anonymous', 'Author followers only', 'Author public']);
    // The unrelated author's question is not included.
    expect(titles).not.toContain('Someone else entirely');

    // The anonymous one is still anonymous, even to a follower.
    const anonymous = after.items.find((item) => item.title === 'Author anonymous');
    expect(anonymous?.authorId).toBeNull();
    expect(anonymous?.authorHandle).toBeNull();
  });

  it('returns only followers-only questions when scope is "followers"', async () => {
    // The merged feed unions this callable with a direct public-question query, so it
    // must be able to ask for the followers-only half alone. Without that, a followed
    // author's public questions would appear on both sides of the union.
    const author = await createSignedUpUser('author');
    const follower = await createSignedUpUser('follower');
    await callFunction('setFollow', follower, { targetUid: author.uid, follow: true });

    await callFunction('createQuestion', author, { ...publicQuestion, title: 'Public one' });
    await callFunction('createQuestion', author, {
      ...publicQuestion,
      title: 'Followers only one',
      visibility: 'followers',
    });

    const scoped = await callFunction<Page<QuestionWithViewerState>>(
      'listFollowingFeed',
      follower,
      { scope: 'followers' },
    );
    expect(scoped.items.map((item) => item.title)).toEqual(['Followers only one']);

    // The default is still everything, so the standalone "people I follow" view is
    // unchanged.
    const everything = await callFunction<Page<QuestionWithViewerState>>(
      'listFollowingFeed',
      follower,
      {},
    );
    expect(everything.items.map((item) => item.title).sort()).toEqual([
      'Followers only one',
      'Public one',
    ]);
  });

  it('rejects an unknown scope', async () => {
    const follower = await createSignedUpUser('follower');
    const error = await expectCallableError(
      callFunction('listFollowingFeed', follower, { scope: 'everything' }),
    );
    expect(error.status).toBe('INVALID_ARGUMENT');
  });

  it('paginates with a cursor without repeating or skipping items', async () => {
    const author = await createSignedUpUser('author');
    const follower = await createSignedUpUser('follower');
    await callFunction('setFollow', follower, { targetUid: author.uid, follow: true });

    // Created sequentially so createdAt ordering is well-defined.
    for (let index = 0; index < 5; index += 1) {
      await callFunction('createQuestion', author, {
        ...publicQuestion,
        title: `Question number ${index}`,
      });
    }

    const seen: string[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < 5; page += 1) {
      const result: Page<QuestionWithViewerState> = await callFunction(
        'listFollowingFeed',
        follower,
        { cursor, limit: 2 },
      );
      seen.push(...result.items.map((item) => item.id));
      cursor = result.nextCursor;
      if (!cursor) break;
    }

    expect(seen).toHaveLength(5);
    expect(new Set(seen).size).toBe(5);
  });
});

describe('listMyQuestions', () => {
  it('includes the author’s anonymous and followers-only questions', async () => {
    const alice = await createSignedUpUser('alice');
    await callFunction('createQuestion', alice, { ...publicQuestion, title: 'Mine public' });
    await callFunction('createQuestion', alice, {
      ...publicQuestion,
      title: 'Mine anonymous',
      anonymous: true,
    });
    await callFunction('createQuestion', alice, {
      ...publicQuestion,
      title: 'Mine followers only',
      visibility: 'followers',
    });

    const page = await callFunction<Page<QuestionWithViewerState>>('listMyQuestions', alice, {});
    expect(page.items.map((item) => item.title).sort()).toEqual([
      'Mine anonymous',
      'Mine followers only',
      'Mine public',
    ]);
    expect(page.items.every((item) => item.viewerIsAuthor)).toBe(true);
  });

  it('excludes deleted questions', async () => {
    const alice = await createSignedUpUser('alice');
    const created = await callFunction<QuestionWithViewerState>(
      'createQuestion',
      alice,
      publicQuestion,
    );
    await callFunction('deleteQuestion', alice, { questionId: created.id });

    const page = await callFunction<Page<QuestionWithViewerState>>('listMyQuestions', alice, {});
    expect(page.items).toEqual([]);
  });
});

describe('updateQuestion', () => {
  it('lets the author change visibility and anonymity', async () => {
    const alice = await createSignedUpUser('alice');
    const created = await callFunction<QuestionWithViewerState>(
      'createQuestion',
      alice,
      publicQuestion,
    );

    const hidden = await callFunction<QuestionWithViewerState>('updateQuestion', alice, {
      questionId: created.id,
      visibility: 'followers',
      anonymous: true,
    });
    expect(hidden.visibility).toBe('followers');
    expect(hidden.anonymous).toBe(true);
    // Going anonymous must actually strip the author from the readable document.
    expect(hidden.authorId).toBeNull();
    expect(hidden.authorHandle).toBeNull();

    const shown = await callFunction<QuestionWithViewerState>('updateQuestion', alice, {
      questionId: created.id,
      anonymous: false,
    });
    expect(shown.authorId).toBe(alice.uid);
    expect(shown.authorHandle).toBeTruthy();
  });

  it('rejects edits from a non-author', async () => {
    const alice = await createSignedUpUser('alice');
    const bob = await createSignedUpUser('bob');
    const created = await callFunction<QuestionWithViewerState>(
      'createQuestion',
      alice,
      publicQuestion,
    );

    const error = await expectCallableError(
      callFunction('updateQuestion', bob, { questionId: created.id, visibility: 'followers' }),
    );
    expect(error.status).toBe('PERMISSION_DENIED');
  });

  it('locks the wording once a question has votes', async () => {
    const alice = await createSignedUpUser('alice');
    const bob = await createSignedUpUser('bob');
    const created = await callFunction<QuestionWithViewerState>(
      'createQuestion',
      alice,
      publicQuestion,
    );
    await callFunction('castVote', bob, {
      questionId: created.id,
      optionId: created.options[0]!.id,
    });

    const error = await expectCallableError(
      callFunction('updateQuestion', alice, {
        questionId: created.id,
        title: 'A completely different question',
      }),
    );
    expect(error.status).toBe('FAILED_PRECONDITION');

    // Visibility is still changeable, though.
    const updated = await callFunction<QuestionWithViewerState>('updateQuestion', alice, {
      questionId: created.id,
      visibility: 'followers',
    });
    expect(updated.visibility).toBe('followers');
  });
});

describe('deleteQuestion', () => {
  it('rejects deletion by a non-author', async () => {
    const alice = await createSignedUpUser('alice');
    const bob = await createSignedUpUser('bob');
    const created = await callFunction<QuestionWithViewerState>(
      'createQuestion',
      alice,
      publicQuestion,
    );

    const error = await expectCallableError(
      callFunction('deleteQuestion', bob, { questionId: created.id }),
    );
    expect(error.status).toBe('PERMISSION_DENIED');
  });

  it('decrements the author stats and is safe to repeat', async () => {
    const alice = await createSignedUpUser('alice');
    const created = await callFunction<QuestionWithViewerState>(
      'createQuestion',
      alice,
      publicQuestion,
    );

    await callFunction('deleteQuestion', alice, { questionId: created.id });
    // A double-click must not double-decrement.
    await callFunction('deleteQuestion', alice, { questionId: created.id });

    const profile = await callFunction<PublicProfile>('ensureProfile', alice, {});
    expect(profile.stats.questions).toBe(0);
    expect(profile.score).toBe(0);
  });
});

describe('setFollow', () => {
  it('keeps both sides of the edge and both counters consistent', async () => {
    const alice = await createSignedUpUser('alice');
    const bob = await createSignedUpUser('bob');

    await callFunction('setFollow', alice, { targetUid: bob.uid, follow: true });

    const aliceProfile = await callFunction<PublicProfile>('ensureProfile', alice, {});
    const bobProfile = await callFunction<PublicProfile>('ensureProfile', bob, {});
    expect(aliceProfile.stats.following).toBe(1);
    expect(bobProfile.stats.followers).toBe(1);
    // 10 points per following, 30 per follower.
    expect(aliceProfile.score).toBe(10);
    expect(bobProfile.score).toBe(30);
  });

  it('is idempotent, so repeated clicks cannot inflate counters', async () => {
    const alice = await createSignedUpUser('alice');
    const bob = await createSignedUpUser('bob');

    await Promise.all([
      callFunction('setFollow', alice, { targetUid: bob.uid, follow: true }),
      callFunction('setFollow', alice, { targetUid: bob.uid, follow: true }),
      callFunction('setFollow', alice, { targetUid: bob.uid, follow: true }),
    ]);

    const bobProfile = await callFunction<PublicProfile>('ensureProfile', bob, {});
    expect(bobProfile.stats.followers).toBe(1);
  });

  it('unfollows cleanly and never goes negative', async () => {
    const alice = await createSignedUpUser('alice');
    const bob = await createSignedUpUser('bob');

    await callFunction('setFollow', alice, { targetUid: bob.uid, follow: false });
    await callFunction('setFollow', alice, { targetUid: bob.uid, follow: true });
    await callFunction('setFollow', alice, { targetUid: bob.uid, follow: false });
    await callFunction('setFollow', alice, { targetUid: bob.uid, follow: false });

    const aliceProfile = await callFunction<PublicProfile>('ensureProfile', alice, {});
    const bobProfile = await callFunction<PublicProfile>('ensureProfile', bob, {});
    expect(aliceProfile.stats.following).toBe(0);
    expect(bobProfile.stats.followers).toBe(0);
  });

  it('rejects following yourself', async () => {
    const alice = await createSignedUpUser('alice');
    const error = await expectCallableError(
      callFunction('setFollow', alice, { targetUid: alice.uid, follow: true }),
    );
    expect(error.status).toBe('INVALID_ARGUMENT');
  });

  it('rejects following an account that does not exist', async () => {
    const alice = await createSignedUpUser('alice');
    const error = await expectCallableError(
      callFunction('setFollow', alice, { targetUid: 'no-such-account', follow: true }),
    );
    expect(error.status).toBe('NOT_FOUND');
  });
});

describe('reportQuestion', () => {
  it('accepts a report and de-duplicates repeat reports from the same account', async () => {
    const alice = await createSignedUpUser('alice');
    const bob = await createSignedUpUser('bob');
    const created = await callFunction<QuestionWithViewerState>(
      'createQuestion',
      alice,
      publicQuestion,
    );

    await callFunction('reportQuestion', bob, { questionId: created.id, reason: 'Spam' });
    await callFunction('reportQuestion', bob, { questionId: created.id, reason: 'Still spam' });

    const error = await expectCallableError(
      callFunction('reportQuestion', bob, { questionId: created.id, reason: '' }),
    );
    expect(error.status).toBe('INVALID_ARGUMENT');
  });
});

describe('authentication', () => {
  it('rejects every mutating callable without a token', async () => {
    for (const name of [
      'createQuestion',
      'updateQuestion',
      'deleteQuestion',
      'castVote',
      'setFollow',
      'setHandle',
      'listMyQuestions',
      'listFollowingFeed',
      'getQuestion',
      'reportQuestion',
    ]) {
      const error = await expectCallableError(callFunction(name, null, {}));
      expect(error.status, `${name} should require auth`).toBe('UNAUTHENTICATED');
    }
  });
});
