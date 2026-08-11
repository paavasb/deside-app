/**
 * DeSide Cloud Functions.
 *
 * Every mutation in the product goes through one of these callables. Clients have
 * no Firestore write access at all (see firestore.rules), so this file is the
 * complete list of ways data can change.
 */

export { ensureProfile, setHandle } from './callables/profile';
export {
  createQuestion,
  deleteQuestion,
  getQuestion,
  listMyQuestions,
  updateQuestion,
} from './callables/questions';
export { castVote } from './callables/votes';
export { setFollow } from './callables/follows';
export { listFollowingFeed } from './callables/feed';
export { reportQuestion } from './callables/moderation';
