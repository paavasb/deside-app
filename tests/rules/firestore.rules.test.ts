import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

/**
 * Security rules tests.
 *
 * These are the guarantees the product's privacy claims rest on, so they are asserted
 * directly against the rules rather than inferred from application code:
 *
 *   * clients cannot write anything, anywhere;
 *   * a followers-only question is not readable by a client at all, even by a
 *     follower — that path exists only through a callable function;
 *   * an anonymous question's author cannot be recovered by any client read;
 *   * nobody can enumerate another account's social graph, votes, or answers;
 *   * an unconstrained question query fails instead of leaking private documents.
 */

const PROJECT_ID = 'deside-test';
const RULES_PATH = fileURLToPath(new URL('../../firestore.rules', import.meta.url));

const AUTHOR = 'author-uid';
const FOLLOWER = 'follower-uid';
const STRANGER = 'stranger-uid';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

/** Seeds data the way the Cloud Functions would, bypassing rules. */
async function seed() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await setDoc(doc(db, 'profiles', AUTHOR), {
      handle: 'author',
      handleLower: 'author',
      displayName: 'Author',
      photoURL: null,
      stats: { questions: 2, answers: 0, followers: 1, following: 0 },
      score: 70,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await setDoc(doc(db, 'profiles', FOLLOWER), {
      handle: 'follower',
      handleLower: 'follower',
      displayName: 'Follower',
      photoURL: null,
      stats: { questions: 0, answers: 1, followers: 0, following: 1 },
      score: 11,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await setDoc(doc(db, 'handles', 'author'), { uid: AUTHOR, createdAt: new Date() });

    // FOLLOWER follows AUTHOR — both directions, as setFollow writes them.
    await setDoc(doc(db, 'profiles', FOLLOWER, 'following', AUTHOR), {
      handle: 'author',
      createdAt: new Date(),
    });
    await setDoc(doc(db, 'profiles', AUTHOR, 'followers', FOLLOWER), {
      handle: 'follower',
      createdAt: new Date(),
    });

    const baseQuestion = {
      options: [
        { id: 'opt-1', text: 'Yes' },
        { id: 'opt-2', text: 'No' },
      ],
      optionVotes: { 'opt-1': 1, 'opt-2': 0 },
      totalVotes: 1,
      tags: ['life'],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(doc(db, 'questions', 'public-q'), {
      ...baseQuestion,
      title: 'A public question',
      visibility: 'public',
      anonymous: false,
      authorId: AUTHOR,
      authorHandle: 'author',
    });

    await setDoc(doc(db, 'questions', 'followers-q'), {
      ...baseQuestion,
      title: 'A followers-only question',
      visibility: 'followers',
      anonymous: false,
      authorId: AUTHOR,
      authorHandle: 'author',
    });

    // Anonymous: the readable document names nobody.
    await setDoc(doc(db, 'questions', 'anon-q'), {
      ...baseQuestion,
      title: 'An anonymous question',
      visibility: 'public',
      anonymous: true,
      authorId: null,
      authorHandle: null,
    });

    await setDoc(doc(db, 'questions', 'removed-q'), {
      ...baseQuestion,
      title: 'A deleted question',
      visibility: 'public',
      anonymous: false,
      authorId: AUTHOR,
      authorHandle: 'author',
    });
    await setDoc(doc(db, 'questions', 'removed-q'), { status: 'removed' }, { merge: true });

    // Server-private author records, including for the anonymous question.
    for (const [id, visibility, anonymous] of [
      ['public-q', 'public', false],
      ['followers-q', 'followers', false],
      ['anon-q', 'public', true],
      ['removed-q', 'public', false],
    ] as const) {
      await setDoc(doc(db, 'questionAuthors', id), {
        authorId: AUTHOR,
        visibility,
        anonymous,
        status: id === 'removed-q' ? 'removed' : 'active',
        createdAt: new Date(),
      });
    }

    // Owner-only authorship index. `removed-q` deliberately has no entry, matching
    // deleteQuestion, which removes it.
    for (const id of ['public-q', 'followers-q', 'anon-q']) {
      await setDoc(doc(db, 'profiles', AUTHOR, 'authored', id), {
        questionId: id,
        visibility: id === 'followers-q' ? 'followers' : 'public',
        anonymous: id === 'anon-q',
        createdAt: new Date(),
      });
    }

    await setDoc(doc(db, 'questions', 'public-q', 'votes', FOLLOWER), {
      optionId: 'opt-1',
      createdAt: new Date(),
    });
    await setDoc(doc(db, 'profiles', FOLLOWER, 'answers', 'public-q'), {
      questionId: 'public-q',
      optionId: 'opt-1',
      createdAt: new Date(),
    });

    await setDoc(doc(db, 'reports', 'public-q_follower'), {
      questionId: 'public-q',
      reporterId: FOLLOWER,
      reason: 'spam',
      status: 'open',
      createdAt: new Date(),
    });
    await setDoc(doc(db, 'rateLimits', `${FOLLOWER}_castVote`), {
      action: 'castVote',
      uid: FOLLOWER,
      count: 1,
      windowStartedAt: new Date(),
    });
  });
}

const asAuthor = () => testEnv.authenticatedContext(AUTHOR).firestore();
const asFollower = () => testEnv.authenticatedContext(FOLLOWER).firestore();
const asStranger = () => testEnv.authenticatedContext(STRANGER).firestore();
const asGuest = () => testEnv.unauthenticatedContext().firestore();

// A clean, freshly seeded database before every test, so no test can depend on
// another's writes.
beforeEach(async () => {
  await testEnv.clearFirestore();
  await seed();
});

describe('questions: reads', () => {
  it('lets any signed-in user read a public active question', async () => {
    await assertSucceeds(getDoc(doc(asStranger(), 'questions', 'public-q')));
  });

  it('rejects unauthenticated reads', async () => {
    await assertFails(getDoc(doc(asGuest(), 'questions', 'public-q')));
  });

  it('allows a correctly constrained public feed query', async () => {
    const snapshot = await assertSucceeds(
      getDocs(
        query(
          collection(asStranger(), 'questions'),
          where('visibility', '==', 'public'),
          where('status', '==', 'active'),
          orderBy('createdAt', 'desc'),
          limit(20),
        ),
      ),
    );
    // Public + active only: the followers-only and removed questions are excluded.
    expect(snapshot.docs.map((d) => d.id).sort()).toEqual(['anon-q', 'public-q']);
  });

  it('rejects an unconstrained question query instead of filtering it', async () => {
    // Rules are evaluated per candidate document on a list, so a query that could
    // return a followers-only or removed question fails outright.
    await assertFails(getDocs(query(collection(asStranger(), 'questions'), limit(20))));
  });

  it('rejects a query that drops the status constraint', async () => {
    await assertFails(
      getDocs(
        query(
          collection(asStranger(), 'questions'),
          where('visibility', '==', 'public'),
          limit(20),
        ),
      ),
    );
  });

  it('rejects a query asking directly for followers-only questions', async () => {
    await assertFails(
      getDocs(
        query(
          collection(asFollower(), 'questions'),
          where('visibility', '==', 'followers'),
          where('status', '==', 'active'),
          limit(20),
        ),
      ),
    );
  });

  it('rejects a list request above the page ceiling', async () => {
    await assertFails(
      getDocs(
        query(
          collection(asStranger(), 'questions'),
          where('visibility', '==', 'public'),
          where('status', '==', 'active'),
          limit(500),
        ),
      ),
    );
  });
});

describe('questions: followers-only privacy', () => {
  it('hides a followers-only question from a stranger', async () => {
    await assertFails(getDoc(doc(asStranger(), 'questions', 'followers-q')));
  });

  it('hides a followers-only question even from a follower', async () => {
    // Followers reach it only through the listFollowingFeed / getQuestion callables,
    // which verify the follow edge server-side. No client read path exists.
    await assertFails(getDoc(doc(asFollower(), 'questions', 'followers-q')));
  });

  it('lets the author read their own followers-only question', async () => {
    await assertSucceeds(getDoc(doc(asAuthor(), 'questions', 'followers-q')));
  });

  it('hides a removed question from everyone, including its author', async () => {
    // deleteQuestion drops the author's `authored` entry, which revokes the
    // authorship grant along with it.
    await assertFails(getDoc(doc(asAuthor(), 'questions', 'removed-q')));
    await assertFails(getDoc(doc(asStranger(), 'questions', 'removed-q')));
  });
});

describe('anonymity', () => {
  it('does not expose the author on the readable question document', async () => {
    const snapshot = await getDoc(doc(asStranger(), 'questions', 'anon-q'));
    expect(snapshot.get('authorId')).toBeNull();
    expect(snapshot.get('authorHandle')).toBeNull();
  });

  it('denies every client access to the server-private author record', async () => {
    await assertFails(getDoc(doc(asStranger(), 'questionAuthors', 'anon-q')));
    await assertFails(getDoc(doc(asFollower(), 'questionAuthors', 'anon-q')));
    // Not even the author can read it — they use their own `authored` index instead.
    await assertFails(getDoc(doc(asAuthor(), 'questionAuthors', 'anon-q')));
    await assertFails(getDocs(query(collection(asStranger(), 'questionAuthors'), limit(10))));
  });

  it('keeps the authorship index readable only by its owner', async () => {
    await assertSucceeds(getDoc(doc(asAuthor(), 'profiles', AUTHOR, 'authored', 'anon-q')));
    await assertFails(getDoc(doc(asStranger(), 'profiles', AUTHOR, 'authored', 'anon-q')));
    await assertFails(
      getDocs(query(collection(asStranger(), 'profiles', AUTHOR, 'authored'), limit(10))),
    );
  });
});

describe('votes', () => {
  it('lets a voter read back only their own vote', async () => {
    await assertSucceeds(getDoc(doc(asFollower(), 'questions', 'public-q', 'votes', FOLLOWER)));
    await assertFails(getDoc(doc(asStranger(), 'questions', 'public-q', 'votes', FOLLOWER)));
    await assertFails(getDoc(doc(asAuthor(), 'questions', 'public-q', 'votes', FOLLOWER)));
  });

  it('never allows listing who voted for what', async () => {
    await assertFails(
      getDocs(query(collection(asAuthor(), 'questions', 'public-q', 'votes'), limit(10))),
    );
    await assertFails(
      getDocs(query(collection(asFollower(), 'questions', 'public-q', 'votes'), limit(10))),
    );
  });
});

describe('social graph and answer history', () => {
  it('keeps follow lists readable only by their owner', async () => {
    await assertSucceeds(
      getDocs(query(collection(asFollower(), 'profiles', FOLLOWER, 'following'), limit(10))),
    );
    await assertFails(
      getDocs(query(collection(asAuthor(), 'profiles', FOLLOWER, 'following'), limit(10))),
    );
    await assertFails(
      getDocs(query(collection(asStranger(), 'profiles', AUTHOR, 'followers'), limit(10))),
    );
  });

  it('keeps answer history readable only by its owner', async () => {
    await assertSucceeds(getDoc(doc(asFollower(), 'profiles', FOLLOWER, 'answers', 'public-q')));
    await assertFails(getDoc(doc(asAuthor(), 'profiles', FOLLOWER, 'answers', 'public-q')));
  });

  it('exposes only aggregate counters on a public profile', async () => {
    const snapshot = await assertSucceeds(getDoc(doc(asStranger(), 'profiles', AUTHOR)));
    expect(snapshot.get('stats')).toEqual({
      questions: 2,
      answers: 0,
      followers: 1,
      following: 0,
    });
  });
});

describe('handles', () => {
  it('allows a direct handle lookup but not enumeration', async () => {
    await assertSucceeds(getDoc(doc(asStranger(), 'handles', 'author')));
    await assertFails(getDocs(query(collection(asStranger(), 'handles'), limit(10))));
  });
});

describe('server-only collections', () => {
  it('denies all client access to reports and rate limits', async () => {
    await assertFails(getDoc(doc(asFollower(), 'reports', 'public-q_follower')));
    await assertFails(getDoc(doc(asFollower(), 'rateLimits', `${FOLLOWER}_castVote`)));
    await assertFails(getDocs(query(collection(asAuthor(), 'reports'), limit(10))));
  });
});

describe('writes', () => {
  it('denies every client write, everywhere', async () => {
    const follower = asFollower();
    const author = asAuthor();

    // Forge a vote counter — the v1 vulnerability this model exists to close.
    await assertFails(
      setDoc(doc(follower, 'questions', 'public-q'), { totalVotes: 9999 }, { merge: true }),
    );
    // Vote directly, bypassing the one-vote-per-account transaction.
    await assertFails(
      setDoc(doc(follower, 'questions', 'public-q', 'votes', FOLLOWER), { optionId: 'opt-2' }),
    );
    // Inflate your own score.
    await assertFails(setDoc(doc(follower, 'profiles', FOLLOWER), { score: 1e9 }, { merge: true }));
    // Add yourself to someone else's followers.
    await assertFails(
      setDoc(doc(follower, 'profiles', AUTHOR, 'followers', STRANGER), { handle: 'x' }),
    );
    // Grant yourself authorship of someone else's question.
    await assertFails(
      setDoc(doc(follower, 'profiles', FOLLOWER, 'authored', 'followers-q'), {
        questionId: 'followers-q',
      }),
    );
    // Steal a handle.
    await assertFails(setDoc(doc(follower, 'handles', 'author'), { uid: FOLLOWER }));
    // Even an author cannot write their own question directly.
    await assertFails(
      setDoc(doc(author, 'questions', 'public-q'), { title: 'edited' }, { merge: true }),
    );
    await assertFails(
      setDoc(doc(author, 'questionAuthors', 'anon-q'), { authorId: STRANGER }, { merge: true }),
    );
    // And nobody can create a question client-side at all.
    await assertFails(
      setDoc(doc(follower, 'questions', 'forged-q'), {
        title: 'forged',
        visibility: 'public',
        status: 'active',
        options: [],
        optionVotes: {},
        totalVotes: 0,
        tags: [],
        anonymous: false,
        authorId: FOLLOWER,
        authorHandle: 'follower',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
  });
});
