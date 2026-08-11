/**
 * Limits and weights shared by the client and Cloud Functions.
 *
 * The client uses these for optimistic form validation; the functions use them
 * as the authoritative check. Never rely on the client copy for security.
 */

export const QUESTION_TITLE_MIN = 3;
export const QUESTION_TITLE_MAX = 280;

export const OPTION_TEXT_MIN = 1;
export const OPTION_TEXT_MAX = 120;
export const OPTIONS_MIN = 2;
export const OPTIONS_MAX = 10;

export const TAG_MIN = 1;
export const TAG_MAX = 24;
/** Firestore `array-contains-any` accepts at most 30 values; we stay well below. */
export const TAGS_MAX = 10;

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 20;
export const HANDLE_PATTERN = /^[a-z0-9_]+$/;

export const REPORT_REASON_MAX = 500;

/** Page size for every paginated list in the product. */
export const PAGE_SIZE = 20;
/** Hard ceiling a client may request, mirrored in firestore.rules. */
export const PAGE_SIZE_MAX = 50;

/**
 * `in` / `array-contains-any` queries are capped by Firestore at 30 values, so
 * the follower feed fans out over at most this many followed authors per page.
 */
export const FEED_AUTHOR_CHUNK = 30;
/** Total authors considered when building a following feed. */
export const FEED_MAX_FOLLOWED_AUTHORS = 300;

/** DeSide Score weights — preserved from the v1 product. */
export const SCORE_WEIGHTS = {
  questions: 20,
  answers: 1,
  followers: 30,
  following: 10,
} as const;

/** Per-account rate limits, expressed as `limit` calls per `windowMs`. */
export const RATE_LIMITS = {
  createQuestion: { limit: 15, windowMs: 60 * 60 * 1000 },
  updateQuestion: { limit: 60, windowMs: 60 * 60 * 1000 },
  deleteQuestion: { limit: 30, windowMs: 60 * 60 * 1000 },
  castVote: { limit: 200, windowMs: 60 * 60 * 1000 },
  setFollow: { limit: 120, windowMs: 60 * 60 * 1000 },
  setHandle: { limit: 5, windowMs: 24 * 60 * 60 * 1000 },
  reportQuestion: { limit: 20, windowMs: 24 * 60 * 60 * 1000 },
} as const;

export type RateLimitedAction = keyof typeof RATE_LIMITS;

/** Sentinel tag used by v1 when a question had no tags. Filtered out on read. */
export const LEGACY_EMPTY_TAG = 'none';
