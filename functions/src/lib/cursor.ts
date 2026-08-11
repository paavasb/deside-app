import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

/**
 * Opaque keyset cursor for `orderBy('createdAt', 'desc')` queries.
 *
 * Keyset pagination keeps page cost constant and stays correct while documents are
 * inserted underneath the reader, unlike offsets.
 *
 * The timestamp is carried as `seconds` + `nanos` rather than milliseconds so
 * `startAfter` resumes at the exact stored value. Truncating to millis would make
 * two documents written in the same millisecond indistinguishable, and one of them
 * would be silently skipped between pages.
 */
export interface Cursor {
  seconds: number;
  nanos: number;
  id: string;
}

export function encodeCursor(timestamp: Timestamp, id: string): string {
  const cursor: Cursor = {
    seconds: timestamp.seconds,
    nanos: timestamp.nanoseconds,
    id,
  };
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeCursor(raw: string | null | undefined): Cursor | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as Partial<Cursor>;
    if (
      typeof parsed.seconds === 'number' &&
      Number.isFinite(parsed.seconds) &&
      typeof parsed.nanos === 'number' &&
      Number.isFinite(parsed.nanos) &&
      typeof parsed.id === 'string'
    ) {
      return { seconds: parsed.seconds, nanos: parsed.nanos, id: parsed.id };
    }
  } catch {
    // fall through to the shared error below
  }
  throw new HttpsError('invalid-argument', 'Invalid pagination cursor.');
}

export function cursorTimestamp(cursor: Cursor): Timestamp {
  return new Timestamp(cursor.seconds, cursor.nanos);
}
