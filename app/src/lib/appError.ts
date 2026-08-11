import { FirebaseError } from 'firebase/app';

/** Canonical error codes the UI branches on. */
export type AppErrorCode =
  | 'unauthenticated'
  | 'permission-denied'
  | 'not-found'
  | 'already-exists'
  | 'invalid-argument'
  | 'failed-precondition'
  | 'rate-limited'
  | 'offline'
  | 'unknown';

export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AppError';
    this.code = code;
  }
}

const FUNCTION_CODE_MAP: Record<string, AppErrorCode> = {
  'functions/unauthenticated': 'unauthenticated',
  'functions/permission-denied': 'permission-denied',
  'functions/not-found': 'not-found',
  'functions/already-exists': 'already-exists',
  'functions/invalid-argument': 'invalid-argument',
  'functions/failed-precondition': 'failed-precondition',
  'functions/resource-exhausted': 'rate-limited',
  'functions/unavailable': 'offline',
  'functions/deadline-exceeded': 'offline',
  'permission-denied': 'permission-denied',
  'not-found': 'not-found',
  unavailable: 'offline',
};

const FALLBACK_MESSAGE: Record<AppErrorCode, string> = {
  unauthenticated: 'Please sign in again.',
  'permission-denied': "You don't have access to that.",
  'not-found': "That doesn't exist any more.",
  'already-exists': 'That already exists.',
  'invalid-argument': 'Please check the details and try again.',
  'failed-precondition': "That can't be done right now.",
  'rate-limited': "You're doing that too often. Please wait a moment.",
  offline: "Can't reach DeSide. Check your connection and try again.",
  unknown: 'Something went wrong. Please try again.',
};

/**
 * Normalizes anything thrown by the Firebase SDKs into an `AppError`.
 *
 * The callables already return user-safe messages (unexpected failures are
 * collapsed to `internal` server-side), so those messages are surfaced directly.
 * Anything unrecognized falls back to a generic message rather than showing raw
 * SDK text to a user.
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof FirebaseError) {
    const code = FUNCTION_CODE_MAP[error.code] ?? 'unknown';
    const message =
      code === 'unknown' || !error.message ? FALLBACK_MESSAGE[code] : stripPrefix(error.message);
    return new AppError(code, message, { cause: error });
  }

  if (!navigator.onLine) {
    return new AppError('offline', FALLBACK_MESSAGE.offline, { cause: error });
  }

  return new AppError('unknown', FALLBACK_MESSAGE.unknown, { cause: error });
}

/** The Functions SDK prefixes messages with the HTTP status text. */
function stripPrefix(message: string): string {
  return message.replace(/^(INTERNAL|FirebaseError):\s*/i, '').trim();
}

export function errorMessage(error: unknown): string {
  return toAppError(error).message;
}
