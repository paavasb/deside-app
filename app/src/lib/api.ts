import { httpsCallable } from 'firebase/functions';
import type {
  CastVoteInput,
  CreateQuestionInput,
  DeleteQuestionInput,
  EnsureProfileInput,
  GetQuestionInput,
  ListFollowingFeedInput,
  ListMyQuestionsInput,
  ReportQuestionInput,
  SetFollowInput,
  SetHandleInput,
  UpdateQuestionInput,
} from '@shared/schemas';
import type { Page, PublicProfile, QuestionWithViewerState } from '@shared/types';
import { toAppError } from './appError';
import { functions } from './firebase';

/**
 * Typed clients for the callable functions.
 *
 * These are the only ways the app mutates data — Firestore is read-only from the
 * browser (see firestore.rules). Input types come from the same Zod schemas the
 * functions validate against, so a payload shape can't drift between the two.
 */
function callable<TInput, TOutput>(name: string) {
  const fn = httpsCallable<TInput, TOutput>(functions, name);
  return async (input: TInput): Promise<TOutput> => {
    try {
      const result = await fn(input);
      return result.data;
    } catch (error) {
      throw toAppError(error);
    }
  };
}

export const api = {
  ensureProfile: callable<EnsureProfileInput, PublicProfile>('ensureProfile'),
  setHandle: callable<SetHandleInput, PublicProfile>('setHandle'),

  createQuestion: callable<CreateQuestionInput, QuestionWithViewerState>('createQuestion'),
  updateQuestion: callable<UpdateQuestionInput, QuestionWithViewerState>('updateQuestion'),
  deleteQuestion: callable<DeleteQuestionInput, { questionId: string }>('deleteQuestion'),
  getQuestion: callable<GetQuestionInput, QuestionWithViewerState>('getQuestion'),
  listMyQuestions: callable<ListMyQuestionsInput, Page<QuestionWithViewerState>>('listMyQuestions'),

  castVote: callable<CastVoteInput, QuestionWithViewerState>('castVote'),
  setFollow: callable<SetFollowInput, { following: boolean }>('setFollow'),

  listFollowingFeed: callable<ListFollowingFeedInput, Page<QuestionWithViewerState>>(
    'listFollowingFeed',
  ),

  reportQuestion: callable<ReportQuestionInput, { reported: true }>('reportQuestion'),
} as const;
