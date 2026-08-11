import { describe, expect, it } from 'vitest';
import { dateInputToMillis, formatRelativeTime, initialsOf, votePercent } from './format';

describe('votePercent', () => {
  it('returns 0 rather than NaN when nothing has been voted on', () => {
    // v1 rendered `100 * (0 / 0)` into a progress bar, which produced NaN width.
    expect(votePercent(0, 0)).toBe(0);
  });

  it('rounds to whole percentages', () => {
    expect(votePercent(1, 3)).toBe(33);
    expect(votePercent(2, 3)).toBe(67);
    expect(votePercent(7, 7)).toBe(100);
  });
});

describe('formatRelativeTime', () => {
  const now = Date.UTC(2026, 5, 15, 12, 0, 0);

  it('collapses anything under a minute to "just now"', () => {
    expect(formatRelativeTime(now - 30_000, now)).toBe('just now');
  });

  it('describes hours and days', () => {
    expect(formatRelativeTime(now - 3 * 60 * 60 * 1000, now)).toMatch(/3 hours ago/);
    expect(formatRelativeTime(now - 2 * 24 * 60 * 60 * 1000, now)).toMatch(/2 days ago/);
  });

  it('handles a missing timestamp', () => {
    expect(formatRelativeTime(0, now)).toBe('—');
  });
});

describe('dateInputToMillis', () => {
  it('returns null for an empty input', () => {
    expect(dateInputToMillis('')).toBeNull();
  });

  it('maps a date to local midnight, or end of day when asked', () => {
    const start = dateInputToMillis('2026-03-04');
    const end = dateInputToMillis('2026-03-04', true);
    expect(start).not.toBeNull();
    expect(end).not.toBeNull();
    expect(new Date(start!).getHours()).toBe(0);
    expect(new Date(end!).getHours()).toBe(23);
    // An inclusive range must cover the whole day, or questions posted in the
    // afternoon of the end date would be filtered out.
    expect(end! - start!).toBe(24 * 60 * 60 * 1000 - 1);
  });
});

describe('initialsOf', () => {
  it('uses the display name when present, falling back to the handle', () => {
    expect(initialsOf('Paavas Bhasin', 'pb')).toBe('PB');
    expect(initialsOf(null, 'decider')).toBe('D');
    expect(initialsOf('', '')).toBe('?');
  });
});
