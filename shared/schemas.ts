import { z } from 'zod';
import {
  HANDLE_MAX,
  HANDLE_MIN,
  HANDLE_PATTERN,
  OPTIONS_MAX,
  OPTIONS_MIN,
  OPTION_TEXT_MAX,
  OPTION_TEXT_MIN,
  PAGE_SIZE,
  PAGE_SIZE_MAX,
  QUESTION_TITLE_MAX,
  QUESTION_TITLE_MIN,
  REPORT_REASON_MAX,
  TAGS_MAX,
} from './constants';
import { normalizeHandle } from './handle';
import { normalizeTags } from './tags';

/**
 * Callable payload schemas.
 *
 * Every callable parses its input with the schema below before touching
 * Firestore, so an invalid payload is rejected with `invalid-argument` and never
 * reaches a transaction.
 */

const firestoreId = z.string().trim().min(1).max(1500);

export const handleSchema = z
  .string()
  .trim()
  .transform(normalizeHandle)
  .refine((value) => value.length >= HANDLE_MIN && value.length <= HANDLE_MAX, {
    message: `Handle must be ${HANDLE_MIN}–${HANDLE_MAX} characters.`,
  })
  .refine((value) => HANDLE_PATTERN.test(value), {
    message: 'Handle may only contain lowercase letters, numbers and underscores.',
  });

export const visibilitySchema = z.enum(['public', 'followers']);

const titleSchema = z
  .string()
  .trim()
  .min(QUESTION_TITLE_MIN, `Question must be at least ${QUESTION_TITLE_MIN} characters.`)
  .max(QUESTION_TITLE_MAX, `Question must be at most ${QUESTION_TITLE_MAX} characters.`);

const optionsSchema = z
  .array(z.string().trim().min(OPTION_TEXT_MIN).max(OPTION_TEXT_MAX))
  .min(OPTIONS_MIN, `Add at least ${OPTIONS_MIN} options.`)
  .max(OPTIONS_MAX, `Add at most ${OPTIONS_MAX} options.`)
  .refine(
    (options) => new Set(options.map((option) => option.toLowerCase())).size === options.length,
    { message: 'Options must be unique.' },
  );

const tagsSchema = z.array(z.string()).max(50).default([]).transform(normalizeTags);

/** Tag filter for feed queries — normalized the same way as stored tags. */
const tagFilterSchema = z
  .array(z.string())
  .max(TAGS_MAX)
  .optional()
  .transform((value) => (value ? normalizeTags(value) : []));

const limitSchema = z.number().int().positive().max(PAGE_SIZE_MAX).optional().default(PAGE_SIZE);

const cursorSchema = z.string().trim().min(1).max(2000).nullish();

export const ensureProfileInput = z
  .object({
    displayName: z.string().trim().max(120).nullish(),
    photoURL: z.string().trim().url().max(2000).nullish(),
  })
  .default({});

export const setHandleInput = z.object({
  handle: handleSchema,
});

export const createQuestionInput = z.object({
  title: titleSchema,
  options: optionsSchema,
  tags: tagsSchema,
  visibility: visibilitySchema.default('public'),
  anonymous: z.boolean().default(false),
});

export const updateQuestionInput = z
  .object({
    questionId: firestoreId,
    title: titleSchema.optional(),
    tags: tagsSchema.optional(),
    visibility: visibilitySchema.optional(),
    anonymous: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.tags !== undefined ||
      value.visibility !== undefined ||
      value.anonymous !== undefined,
    { message: 'Nothing to update.' },
  );

export const deleteQuestionInput = z.object({
  questionId: firestoreId,
});

export const getQuestionInput = z.object({
  questionId: firestoreId,
});

export const castVoteInput = z.object({
  questionId: firestoreId,
  optionId: firestoreId,
});

export const setFollowInput = z.object({
  targetUid: firestoreId,
  follow: z.boolean(),
});

export const listFollowingFeedInput = z
  .object({
    cursor: cursorSchema,
    tags: tagFilterSchema,
    limit: limitSchema,
    /**
     * Which of a followed author's questions to return.
     *
     * `all` (the default) returns their public and followers-only questions — what the
     * standalone "From people I follow" view wants.
     *
     * `followers` returns only their followers-only questions. The merged feed uses
     * this so it can union with a direct public-question query without a followed
     * author's public questions appearing twice.
     */
    scope: z.enum(['all', 'followers']).optional().default('all'),
  })
  .default({});

export const listMyQuestionsInput = z
  .object({
    cursor: cursorSchema,
    limit: limitSchema,
  })
  .default({});

export const reportQuestionInput = z.object({
  questionId: firestoreId,
  reason: z.string().trim().min(1).max(REPORT_REASON_MAX),
});

export type EnsureProfileInput = z.infer<typeof ensureProfileInput>;
export type SetHandleInput = z.infer<typeof setHandleInput>;
export type CreateQuestionInput = z.input<typeof createQuestionInput>;
export type UpdateQuestionInput = z.input<typeof updateQuestionInput>;
export type DeleteQuestionInput = z.infer<typeof deleteQuestionInput>;
export type GetQuestionInput = z.infer<typeof getQuestionInput>;
export type CastVoteInput = z.infer<typeof castVoteInput>;
export type SetFollowInput = z.infer<typeof setFollowInput>;
export type ListFollowingFeedInput = z.input<typeof listFollowingFeedInput>;
export type ListMyQuestionsInput = z.input<typeof listMyQuestionsInput>;
export type ReportQuestionInput = z.infer<typeof reportQuestionInput>;
