import { HANDLE_MAX, HANDLE_MIN, HANDLE_PATTERN } from './constants';

/**
 * Normalizes a handle to its canonical, case-insensitive form.
 *
 * The normalized value is the document ID in `handles/{normalizedHandle}`, which
 * is what makes handle claims atomic and case-insensitively unique.
 */
export function normalizeHandle(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidHandle(raw: string): boolean {
  const normalized = normalizeHandle(raw);
  return (
    normalized.length >= HANDLE_MIN &&
    normalized.length <= HANDLE_MAX &&
    HANDLE_PATTERN.test(normalized)
  );
}

/**
 * Builds a random default handle for a brand-new account, e.g. `deside_8f3a91`.
 * Callers must still handle collisions by retrying with a fresh suggestion.
 */
export function suggestHandle(seed?: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  const base = (seed ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 10);
  const candidate = base.length >= 2 ? `${base}_${random}` : `deside_${random}`;
  return candidate.slice(0, HANDLE_MAX);
}
