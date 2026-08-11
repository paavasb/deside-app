/**
 * Test harness for driving the callable functions against the Emulator Suite.
 *
 * Requests go over the real callable HTTP protocol with a real Auth-emulator ID
 * token, so what these tests exercise is the same path a browser takes: token
 * verification, Zod validation, rate limiting, transactions and error mapping.
 * Nothing is stubbed.
 */

export const PROJECT_ID = process.env.GCLOUD_PROJECT ?? 'deside-test';
export const REGION = 'us-central1';

const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
const FUNCTIONS_HOST = process.env.FUNCTIONS_EMULATOR_HOST ?? '127.0.0.1:5001';

export interface TestUser {
  uid: string;
  idToken: string;
  email: string;
}

/** Thrown for a non-OK callable response, carrying the `HttpsError` status. */
export class CallableError extends Error {
  constructor(
    readonly status: string,
    message: string,
  ) {
    super(message);
    this.name = 'CallableError';
  }
}

/** Creates a fresh account in the Auth emulator and returns a usable ID token. */
export async function createUser(label: string): Promise<TestUser> {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

  const response = await fetch(
    `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'test-password-123',
        displayName: label,
        returnSecureToken: true,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Auth emulator signUp failed: ${response.status} ${await response.text()}`);
  }

  const body = (await response.json()) as { localId: string; idToken: string };
  return { uid: body.localId, idToken: body.idToken, email };
}

/**
 * Invokes a callable exactly the way the Firebase SDK does: POST `{ data }`,
 * `Authorization: Bearer <idToken>`, and a `{ result }` / `{ error }` envelope.
 */
export async function callFunction<T = unknown>(
  name: string,
  user: TestUser | null,
  data: unknown = {},
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (user) headers.Authorization = `Bearer ${user.idToken}`;

  const response = await fetch(`http://${FUNCTIONS_HOST}/${PROJECT_ID}/${REGION}/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ data }),
  });

  const text = await response.text();
  let payload: { result?: T; error?: { status?: string; message?: string } } = {};
  try {
    payload = JSON.parse(text) as typeof payload;
  } catch {
    throw new Error(`Non-JSON response from ${name}: ${response.status} ${text}`);
  }

  if (payload.error) {
    throw new CallableError(
      payload.error.status ?? 'UNKNOWN',
      payload.error.message ?? 'Unknown callable error',
    );
  }
  if (!response.ok) {
    throw new Error(`${name} failed: ${response.status} ${text}`);
  }

  return payload.result as T;
}

/** Asserts a callable rejects, and returns the error for status assertions. */
export async function expectCallableError(promise: Promise<unknown>): Promise<CallableError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof CallableError) return error;
    throw error;
  }
  throw new Error('Expected the callable to fail, but it succeeded.');
}

/** Wipes all Firestore data between tests. */
export async function clearFirestore(): Promise<void> {
  const response = await fetch(
    `http://${FIRESTORE_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  if (!response.ok) {
    throw new Error(`Failed to clear Firestore: ${response.status} ${await response.text()}`);
  }
}

/** Wipes all Auth accounts between tests. */
export async function clearAuth(): Promise<void> {
  const response = await fetch(`http://${AUTH_HOST}/emulator/v1/projects/${PROJECT_ID}/accounts`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to clear Auth: ${response.status} ${await response.text()}`);
  }
}

/** Registers an account and bootstraps its DeSide profile. */
export async function createSignedUpUser(label: string): Promise<TestUser> {
  const user = await createUser(label);
  await callFunction('ensureProfile', user, {});
  return user;
}
