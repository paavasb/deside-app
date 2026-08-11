import { describe, expect, it } from 'vitest';
import { TAGS_MAX } from '@shared/constants';
import { isValidHandle, normalizeHandle, suggestHandle } from '@shared/handle';
import { castVoteInput, createQuestionInput, setHandleInput } from '@shared/schemas';
import { calculateScore } from '@shared/score';
import { normalizeTag, normalizeTags } from '@shared/tags';

/**
 * These cover the `shared/` module that the client and the Cloud Functions both
 * import. A regression here silently changes what the server enforces, so it is
 * tested independently of either side.
 */

describe('normalizeTag', () => {
  it('lowercases, dashes spaces, and strips punctuation', () => {
    expect(normalizeTag('  Big Decisions!  ')).toBe('big-decisions');
    expect(normalizeTag('C++')).toBe('c');
    expect(normalizeTag('multi   space')).toBe('multi-space');
  });

  it('trims stray dashes so the stored form is canonical', () => {
    expect(normalizeTag('--food--')).toBe('food');
    expect(normalizeTag('a  --  b')).toBe('a-b');
  });

  it('returns empty for input with nothing usable', () => {
    expect(normalizeTag('!!!')).toBe('');
    expect(normalizeTag('   ')).toBe('');
  });
});

describe('normalizeTags', () => {
  it('de-duplicates case variants, since array-contains-any is exact-match', () => {
    expect(normalizeTags(['Food', 'food', 'FOOD'])).toEqual(['food']);
  });

  it('drops empties and the v1 "none" sentinel', () => {
    expect(normalizeTags(['none', '', '!!!', 'travel'])).toEqual(['travel']);
  });

  it('caps the tag count', () => {
    const many = Array.from({ length: 40 }, (_, index) => `tag${index}`);
    expect(normalizeTags(many)).toHaveLength(TAGS_MAX);
  });
});

describe('handles', () => {
  it('normalizes to lowercase, which is what makes uniqueness case-insensitive', () => {
    expect(normalizeHandle('  Decider  ')).toBe('decider');
  });

  it('accepts only letters, numbers and underscores within the length bounds', () => {
    expect(isValidHandle('decider')).toBe(true);
    expect(isValidHandle('DeCiDeR')).toBe(true);
    expect(isValidHandle('a_1')).toBe(true);
    expect(isValidHandle('ab')).toBe(false);
    expect(isValidHandle('has space')).toBe(false);
    expect(isValidHandle('has-dash')).toBe(false);
    expect(isValidHandle('x'.repeat(21))).toBe(false);
  });

  it('always suggests a valid handle, whatever the seed', () => {
    for (const seed of ['Paavas Bhasin', '', '!!!', 'a', 'ünïcödé']) {
      expect(isValidHandle(suggestHandle(seed))).toBe(true);
    }
  });
});

describe('calculateScore', () => {
  it('matches the v1 weighting', () => {
    // 2*20 + 5*1 + 3*30 + 4*10 = 175
    expect(calculateScore({ questions: 2, answers: 5, followers: 3, following: 4 })).toBe(175);
  });

  it('is zero for a brand-new account', () => {
    expect(calculateScore({ questions: 0, answers: 0, followers: 0, following: 0 })).toBe(0);
  });
});

describe('createQuestionInput', () => {
  it('normalizes tags and applies defaults', () => {
    const parsed = createQuestionInput.parse({
      title: '  Should I go?  ',
      options: [' Yes ', 'No'],
      tags: ['Big Decisions', 'big decisions'],
    });

    expect(parsed.title).toBe('Should I go?');
    expect(parsed.options).toEqual(['Yes', 'No']);
    expect(parsed.tags).toEqual(['big-decisions']);
    expect(parsed.visibility).toBe('public');
    expect(parsed.anonymous).toBe(false);
  });

  it('rejects fewer than two options, and duplicates ignoring case', () => {
    expect(createQuestionInput.safeParse({ title: 'Valid title', options: ['one'] }).success).toBe(
      false,
    );
    expect(
      createQuestionInput.safeParse({ title: 'Valid title', options: ['Yes', 'yes'] }).success,
    ).toBe(false);
  });

  it('rejects a title that is too short or too long', () => {
    expect(createQuestionInput.safeParse({ title: 'ab', options: ['a', 'b'] }).success).toBe(false);
    expect(
      createQuestionInput.safeParse({ title: 'x'.repeat(281), options: ['a', 'b'] }).success,
    ).toBe(false);
  });
});

describe('setHandleInput', () => {
  it('normalizes before validating', () => {
    expect(setHandleInput.parse({ handle: '  Decider ' })).toEqual({ handle: 'decider' });
  });

  it('rejects handles the server would reject', () => {
    expect(setHandleInput.safeParse({ handle: 'no' }).success).toBe(false);
    expect(setHandleInput.safeParse({ handle: 'bad-handle' }).success).toBe(false);
  });
});

describe('castVoteInput', () => {
  it('requires both IDs', () => {
    expect(castVoteInput.safeParse({ questionId: 'q', optionId: 'o' }).success).toBe(true);
    expect(castVoteInput.safeParse({ questionId: '', optionId: 'o' }).success).toBe(false);
    expect(castVoteInput.safeParse({ questionId: 'q' }).success).toBe(false);
  });
});
