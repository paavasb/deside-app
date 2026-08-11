/**
 * Seeds the local Emulator Suite with a small, realistic dataset.
 *
 * Run with the emulators up:
 *   npm run dev:emulators      # in one terminal
 *   npm run seed               # in another
 *
 * Refuses to run against anything but an emulator, because it writes directly with
 * the Admin SDK and would bypass every security rule.
 */

import { randomUUID } from 'node:crypto';
import { cert, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { calculateScore } from '../shared/score';
import { normalizeTags } from '../shared/tags';
import type { ProfileStats, Visibility } from '../shared/types';

const PROJECT_ID = process.env.GCLOUD_PROJECT ?? 'demo-deside';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
}
if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
}

// Guard rail: this script must never touch a real project.
const host = process.env.FIRESTORE_EMULATOR_HOST;
if (!/^(127\.0\.0\.1|localhost|0\.0\.0\.0):\d+$/.test(host)) {
  throw new Error(
    `Refusing to seed: FIRESTORE_EMULATOR_HOST is "${host}", which is not a local emulator.`,
  );
}
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  throw new Error(
    'Refusing to seed: GOOGLE_APPLICATION_CREDENTIALS is set, which suggests a real project. Unset it.',
  );
}
void cert; // documents that no real credential is ever used here

initializeApp({ projectId: PROJECT_ID });
const db: Firestore = getFirestore();
const auth = getAuth();

interface SeedUser {
  uid: string;
  handle: string;
  displayName: string;
  email: string;
}

const USERS: Omit<SeedUser, 'uid'>[] = [
  { handle: 'ada', displayName: 'Ada Lovelace', email: 'ada@example.com' },
  { handle: 'grace', displayName: 'Grace Hopper', email: 'grace@example.com' },
  { handle: 'alan', displayName: 'Alan Turing', email: 'alan@example.com' },
];

interface SeedQuestion {
  author: string;
  title: string;
  options: string[];
  tags: string[];
  visibility: Visibility;
  anonymous: boolean;
}

const QUESTIONS: SeedQuestion[] = [
  {
    author: 'ada',
    title: 'Should I take the job in Lisbon or stay put?',
    options: ['Take it', 'Stay put', 'Negotiate first'],
    tags: ['Career', 'Big Decisions'],
    visibility: 'public',
    anonymous: false,
  },
  {
    author: 'ada',
    title: 'Is it weird to eat cereal for dinner?',
    options: ['Completely normal', 'Slightly weird', 'Deeply wrong'],
    tags: ['Food'],
    visibility: 'public',
    anonymous: true,
  },
  {
    author: 'grace',
    title: 'Which laptop should I buy for travelling?',
    options: ['13-inch', '15-inch', 'Tablet and keyboard'],
    tags: ['Tech', 'Travel'],
    visibility: 'public',
    anonymous: false,
  },
  {
    author: 'grace',
    title: 'Honest opinions only: should I cut my own hair?',
    options: ['Do it', 'Please do not'],
    tags: ['Life'],
    // Only Ada follows Grace in the seed data, so this exercises the private feed.
    visibility: 'followers',
    anonymous: false,
  },
  {
    author: 'alan',
    title: 'Best way to learn a new language as an adult?',
    options: ['Daily app practice', 'Immersion trip', 'Weekly classes', 'Language exchange'],
    tags: ['Learning'],
    visibility: 'public',
    anonymous: false,
  },
];

/** `ada follows grace`, and so on. */
const FOLLOWS: [string, string][] = [
  ['ada', 'grace'],
  ['ada', 'alan'],
  ['grace', 'ada'],
  ['alan', 'ada'],
];

/** `[voter, questionTitlePrefix, optionIndex]` */
const VOTES: [string, string, number][] = [
  ['grace', 'Should I take the job', 0],
  ['alan', 'Should I take the job', 1],
  ['ada', 'Which laptop', 2],
  ['alan', 'Which laptop', 0],
  ['ada', 'Best way to learn', 1],
  ['grace', 'Best way to learn', 1],
  ['ada', 'Honest opinions only', 0],
];

async function ensureAuthUser(user: Omit<SeedUser, 'uid'>): Promise<string> {
  try {
    const existing = await auth.getUserByEmail(user.email);
    return existing.uid;
  } catch {
    const created = await auth.createUser({
      email: user.email,
      emailVerified: true,
      displayName: user.displayName,
      password: 'password123',
    });
    return created.uid;
  }
}

async function wipe(): Promise<void> {
  for (const name of [
    'profiles',
    'questions',
    'questionAuthors',
    'handles',
    'reports',
    'rateLimits',
  ]) {
    // recursiveDelete also clears subcollections (votes, following, followers, …).
    await db.recursiveDelete(db.collection(name));
  }
}

async function main(): Promise<void> {
  console.log(`Seeding project "${PROJECT_ID}" via ${host}…`);
  await wipe();

  const stats = new Map<string, ProfileStats>();
  const users = new Map<string, SeedUser>();

  for (const template of USERS) {
    const uid = await ensureAuthUser(template);
    users.set(template.handle, { ...template, uid });
    stats.set(template.handle, { questions: 0, answers: 0, followers: 0, following: 0 });
  }

  // Profiles and handle claims.
  for (const user of users.values()) {
    await db
      .collection('profiles')
      .doc(user.uid)
      .set({
        handle: user.handle,
        handleLower: user.handle,
        displayName: user.displayName,
        photoURL: null,
        stats: { questions: 0, answers: 0, followers: 0, following: 0 },
        score: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    await db.collection('handles').doc(user.handle).set({
      uid: user.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  // Follow edges, both directions plus counters, exactly as setFollow writes them.
  for (const [followerHandle, targetHandle] of FOLLOWS) {
    const follower = users.get(followerHandle)!;
    const target = users.get(targetHandle)!;

    await db
      .collection('profiles')
      .doc(follower.uid)
      .collection('following')
      .doc(target.uid)
      .set({ handle: target.handle, createdAt: FieldValue.serverTimestamp() });
    await db
      .collection('profiles')
      .doc(target.uid)
      .collection('followers')
      .doc(follower.uid)
      .set({ handle: follower.handle, createdAt: FieldValue.serverTimestamp() });

    stats.get(followerHandle)!.following += 1;
    stats.get(targetHandle)!.followers += 1;
  }

  // Questions, with their server-private author record and owner-only index.
  const questionIds = new Map<string, { id: string; optionIds: string[] }>();

  for (const template of QUESTIONS) {
    const author = users.get(template.author)!;
    const ref = db.collection('questions').doc();
    const options = template.options.map((text) => ({ id: randomUUID(), text }));
    const optionVotes = Object.fromEntries(options.map((option) => [option.id, 0]));

    await ref.set({
      title: template.title,
      options,
      optionVotes,
      totalVotes: 0,
      tags: normalizeTags(template.tags),
      visibility: template.visibility,
      anonymous: template.anonymous,
      status: 'active',
      authorId: template.anonymous ? null : author.uid,
      authorHandle: template.anonymous ? null : author.handle,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await db.collection('questionAuthors').doc(ref.id).set({
      authorId: author.uid,
      visibility: template.visibility,
      anonymous: template.anonymous,
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
    });

    await db.collection('profiles').doc(author.uid).collection('authored').doc(ref.id).set({
      questionId: ref.id,
      visibility: template.visibility,
      anonymous: template.anonymous,
      createdAt: FieldValue.serverTimestamp(),
    });

    questionIds.set(template.title, { id: ref.id, optionIds: options.map((o) => o.id) });
    stats.get(template.author)!.questions += 1;
  }

  // Votes, with the matching counters and answer records.
  for (const [voterHandle, titlePrefix, optionIndex] of VOTES) {
    const voter = users.get(voterHandle)!;
    const entry = [...questionIds.entries()].find(([title]) => title.startsWith(titlePrefix));
    if (!entry) throw new Error(`Seed error: no question starting with "${titlePrefix}"`);
    const [, question] = entry;
    const optionId = question.optionIds[optionIndex];
    if (!optionId) throw new Error(`Seed error: option ${optionIndex} missing for ${titlePrefix}`);

    await db
      .collection('questions')
      .doc(question.id)
      .collection('votes')
      .doc(voter.uid)
      .set({ optionId, createdAt: FieldValue.serverTimestamp() });

    await db
      .collection('questions')
      .doc(question.id)
      .update({
        [`optionVotes.${optionId}`]: FieldValue.increment(1),
        totalVotes: FieldValue.increment(1),
      });

    await db
      .collection('profiles')
      .doc(voter.uid)
      .collection('answers')
      .doc(question.id)
      .set({ questionId: question.id, optionId, createdAt: FieldValue.serverTimestamp() });

    stats.get(voterHandle)!.answers += 1;
  }

  // Final counters and scores, computed the same way the functions do.
  for (const [handle, counters] of stats) {
    const user = users.get(handle)!;
    await db
      .collection('profiles')
      .doc(user.uid)
      .update({
        stats: counters,
        score: calculateScore(counters),
        updatedAt: FieldValue.serverTimestamp(),
      });
  }

  console.log('\nSeeded:');
  for (const [handle, counters] of stats) {
    console.log(
      `  @${handle.padEnd(6)} score ${String(calculateScore(counters)).padStart(4)}  ` +
        `${counters.questions}q ${counters.answers}a ${counters.followers}f/${counters.following}`,
    );
  }
  console.log('\nSign in as any seeded account in the Auth emulator (password: password123).');
  console.log('Note: Google sign-in in the emulator creates a separate test account.');
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
