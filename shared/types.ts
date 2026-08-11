/**
 * Wire types shared by the client and Cloud Functions.
 *
 * Timestamps cross the callable boundary as epoch milliseconds so the same
 * shapes work for Firestore reads (converted client-side) and function results.
 */

export type Visibility = 'public' | 'followers';
export type QuestionStatus = 'active' | 'removed';

export interface QuestionOption {
  /** Stable ID; vote counters are keyed by this, so option text stays editable. */
  id: string;
  text: string;
}

/** A question as any client is allowed to see it. */
export interface Question {
  id: string;
  title: string;
  options: QuestionOption[];
  /** Votes per option ID. Written only by the castVote function. */
  optionVotes: Record<string, number>;
  totalVotes: number;
  tags: string[];
  visibility: Visibility;
  anonymous: boolean;
  status: QuestionStatus;
  /**
   * Author UID, or `null` when the question is anonymous.
   *
   * For anonymous questions the real author is stored only in the server-private
   * `questionAuthors/{questionId}` document, which no client can read.
   */
  authorId: string | null;
  authorHandle: string | null;
  createdAt: number;
  updatedAt: number;
}

/** A question plus the caller's own relationship to it. */
export interface QuestionWithViewerState extends Question {
  /** The option this viewer voted for, or `null` if they have not voted. */
  viewerOptionId: string | null;
  /** True when the viewer authored it (including anonymously). */
  viewerIsAuthor: boolean;
}

export interface ProfileStats {
  questions: number;
  answers: number;
  followers: number;
  following: number;
}

/** Profile fields readable by any signed-in user. */
export interface PublicProfile {
  uid: string;
  handle: string;
  displayName: string | null;
  photoURL: string | null;
  stats: ProfileStats;
  score: number;
  createdAt: number;
}

export interface FollowEdge {
  uid: string;
  handle: string;
  createdAt: number;
}

export interface AnswerRecord {
  questionId: string;
  optionId: string;
  createdAt: number;
}

/** Cursor-paginated result envelope used by every list callable. */
export interface Page<T> {
  items: T[];
  /** Opaque cursor for the next page, or `null` when the list is exhausted. */
  nextCursor: string | null;
}
