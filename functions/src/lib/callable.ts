import type { CallableOptions } from 'firebase-functions/v2/https';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import type { z } from 'zod';
import type { RateLimitedAction } from '../../../shared/constants';
import { parseInput, toHttpsError } from './errors';
import { enforceRateLimit } from './rateLimit';

/**
 * App Check enforcement is opt-in via env so the backend keeps working before
 * App Check is registered for the web app. Flip `APP_CHECK_ENFORCE=true` (see
 * docs/RUNBOOK.md) once the reCAPTCHA site key is wired into the client.
 */
const enforceAppCheck = process.env.APP_CHECK_ENFORCE === 'true';

const baseOptions: CallableOptions = {
  region: 'us-central1',
  enforceAppCheck,
  // Keep a floor of 0 instances: this is a low-traffic app and cold starts are
  // preferable to paying for idle capacity. Raise for production traffic.
  minInstances: 0,
  maxInstances: 10,
  memory: '256MiB',
  timeoutSeconds: 30,
  cors: true,
};

interface AuthedContext<T> {
  uid: string;
  input: T;
  /** Best-effort identity hints from the token, for profile bootstrap. */
  token: { name?: string; picture?: string; email?: string };
}

interface DefineOptions {
  /** Applies a per-account fixed-window rate limit before the handler runs. */
  rateLimit?: RateLimitedAction;
  /** Overrides for the shared callable options. */
  options?: Partial<CallableOptions>;
}

/**
 * Defines an authenticated callable.
 *
 * The wrapper is the single place that guarantees, for every endpoint:
 *   1. the caller is signed in (`unauthenticated` otherwise),
 *   2. the payload validates against its schema (`invalid-argument` otherwise),
 *   3. the per-account rate limit is respected (`resource-exhausted` otherwise),
 *   4. unexpected failures surface as `internal` rather than leaking internals.
 */
export function defineCallable<S extends z.ZodTypeAny, R>(
  name: string,
  schema: S,
  handler: (context: AuthedContext<z.output<S>>) => Promise<R>,
  defineOptions: DefineOptions = {},
) {
  return onCall<unknown, Promise<R>>(
    { ...baseOptions, ...defineOptions.options },
    async (request) => {
      const auth = request.auth;
      if (!auth) {
        throw new HttpsError('unauthenticated', 'You must be signed in.');
      }

      const input = parseInput(schema, request.data);

      if (defineOptions.rateLimit) {
        await enforceRateLimit(auth.uid, defineOptions.rateLimit);
      }

      try {
        return await handler({
          uid: auth.uid,
          input,
          token: {
            name: typeof auth.token.name === 'string' ? auth.token.name : undefined,
            picture: typeof auth.token.picture === 'string' ? auth.token.picture : undefined,
            email: typeof auth.token.email === 'string' ? auth.token.email : undefined,
          },
        });
      } catch (error) {
        throw toHttpsError(name, error);
      }
    },
  );
}
