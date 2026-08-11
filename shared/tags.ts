import { LEGACY_EMPTY_TAG, TAGS_MAX, TAG_MAX } from './constants';

/**
 * Normalizes a tag for storage and querying.
 *
 * Tags are matched with `array-contains-any`, which is an exact-match operator,
 * so both writes and queries must normalize identically or filtering silently
 * returns nothing.
 */
export function normalizeTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, TAG_MAX);
}

/** Normalizes, de-duplicates, drops empties and the v1 `none` sentinel, and caps length. */
export function normalizeTags(raw: readonly string[]): string[] {
  const seen = new Set<string>();
  for (const tag of raw) {
    const normalized = normalizeTag(tag);
    if (!normalized || normalized === LEGACY_EMPTY_TAG) continue;
    seen.add(normalized);
    if (seen.size >= TAGS_MAX) break;
  }
  return [...seen];
}
