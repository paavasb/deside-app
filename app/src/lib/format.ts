/**
 * Formatting helpers.
 *
 * `Intl` replaces v1's Moment and Numeral dependencies — same output, no bundle cost,
 * and locale-aware for free.
 */

const numberFormat = new Intl.NumberFormat();

const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

const dateFormat = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

export function formatDate(millis: number): string {
  return millis > 0 ? dateFormat.format(millis) : '—';
}

export function formatDateTime(millis: number): string {
  return millis > 0 ? dateTimeFormat.format(millis) : '—';
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['week', 7 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

/** "3 hours ago", "last week". Falls back to an absolute date beyond a year. */
export function formatRelativeTime(millis: number, now: number = Date.now()): string {
  if (millis <= 0) return '—';
  const diff = millis - now;
  const magnitude = Math.abs(diff);

  if (magnitude < 60_000) return 'just now';

  for (const [unit, ms] of UNITS) {
    if (magnitude >= ms) {
      return relativeFormat.format(Math.round(diff / ms), unit);
    }
  }
  return formatDate(millis);
}

/** Whole-percent share, guarding the zero-vote case that would produce NaN. */
export function votePercent(votes: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((votes / total) * 100);
}

/** Turns a `<input type="date">` value into epoch millis at local midnight. */
export function dateInputToMillis(value: string, endOfDay = false): number | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999).getTime()
    : new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
}

export function initialsOf(name: string | null, fallback: string): string {
  const source = (name ?? fallback).trim();
  if (!source) return '?';
  const parts = source.split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join('') || '?';
}
