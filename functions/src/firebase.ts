import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Admin SDK singleton.
 *
 * Cloud Functions can reuse a warm instance across invocations, so guard against
 * double initialization. The Admin SDK bypasses security rules by design — every
 * authorization check in this codebase is therefore explicit and in code.
 */
if (getApps().length === 0) {
  initializeApp();
}

export const db = getFirestore();

// Reading a field the client never sent should be a bug, not silently `undefined`.
db.settings({ ignoreUndefinedProperties: false });

export const collections = {
  profiles: 'profiles',
  handles: 'handles',
  questions: 'questions',
  questionAuthors: 'questionAuthors',
  reports: 'reports',
  rateLimits: 'rateLimits',
} as const;

export const subcollections = {
  following: 'following',
  followers: 'followers',
  answers: 'answers',
  authored: 'authored',
  votes: 'votes',
} as const;

export const profileRef = (uid: string) => db.collection(collections.profiles).doc(uid);
export const handleRef = (normalizedHandle: string) =>
  db.collection(collections.handles).doc(normalizedHandle);
export const questionRef = (questionId: string) =>
  db.collection(collections.questions).doc(questionId);
export const questionAuthorRef = (questionId: string) =>
  db.collection(collections.questionAuthors).doc(questionId);
export const voteRef = (questionId: string, uid: string) =>
  questionRef(questionId).collection(subcollections.votes).doc(uid);
export const followingRef = (uid: string, targetUid: string) =>
  profileRef(uid).collection(subcollections.following).doc(targetUid);
export const followerRef = (uid: string, followerUid: string) =>
  profileRef(uid).collection(subcollections.followers).doc(followerUid);
export const answerRef = (uid: string, questionId: string) =>
  profileRef(uid).collection(subcollections.answers).doc(questionId);
export const authoredRef = (uid: string, questionId: string) =>
  profileRef(uid).collection(subcollections.authored).doc(questionId);
