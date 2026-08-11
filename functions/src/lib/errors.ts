import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import type { z } from 'zod';

/**
 * Turns a Zod failure into `invalid-argument` with a message that is safe to show
 * a user, without leaking internal field paths for unexpected keys.
 */
export function invalidArgument(error: z.ZodError): HttpsError {
  const first = error.issues[0];
  const message = first
    ? `${first.path.length > 0 ? `${first.path.join('.')}: ` : ''}${first.message}`
    : 'Invalid request.';
  return new HttpsError('invalid-argument', message, {
    issues: error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
  });
}

/**
 * Parses a callable payload, converting failures into `invalid-argument`.
 *
 * Every callable runs this before touching Firestore, so a malformed payload can
 * never reach a transaction.
 */
export function parseInput<S extends z.ZodTypeAny>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data ?? {});
  if (!result.success) {
    throw invalidArgument(result.error);
  }
  return result.data as z.output<S>;
}

/**
 * Logs and re-raises. `HttpsError` passes through untouched so intentional
 * client-facing errors keep their code; anything else becomes `internal` so
 * stack traces and Firestore internals never reach the browser.
 */
export function toHttpsError(name: string, error: unknown): HttpsError {
  if (error instanceof HttpsError) {
    return error;
  }
  logger.error(`${name} failed`, error);
  return new HttpsError('internal', 'Something went wrong. Please try again.');
}
