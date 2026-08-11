/**
 * Typed access to the build-time environment.
 *
 * Only the Firebase *web* configuration lives here. That configuration is public
 * by design — it identifies the project, it does not authorize anything. Access
 * control comes from Firebase Auth, security rules and the callables. Admin
 * credentials must never appear in this bundle.
 */

interface AppEnv {
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
  };
  /** Point the SDKs at the local Emulator Suite instead of the real project. */
  useEmulators: boolean;
  /** reCAPTCHA Enterprise site key. App Check stays off until this is set. */
  recaptchaSiteKey: string | null;
  functionsRegion: string;
}

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy app/.env.example to app/.env.local and fill in the Firebase web config (see README.md).`,
    );
  }
  return value;
}

const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true';

// With the emulators, only a project ID genuinely matters — the rest can be
// placeholders, which keeps `npm run dev` working with no real project attached.
const emulatorFallback = useEmulators ? 'demo-deside' : undefined;

export const env: AppEnv = {
  firebase: {
    apiKey: required(
      'VITE_FIREBASE_API_KEY',
      import.meta.env.VITE_FIREBASE_API_KEY ?? emulatorFallback,
    ),
    authDomain: required(
      'VITE_FIREBASE_AUTH_DOMAIN',
      import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? emulatorFallback,
    ),
    projectId: required(
      'VITE_FIREBASE_PROJECT_ID',
      import.meta.env.VITE_FIREBASE_PROJECT_ID ?? emulatorFallback,
    ),
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: required(
      'VITE_FIREBASE_APP_ID',
      import.meta.env.VITE_FIREBASE_APP_ID ?? emulatorFallback,
    ),
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  },
  useEmulators,
  recaptchaSiteKey: import.meta.env.VITE_RECAPTCHA_SITE_KEY ?? null,
  functionsRegion: import.meta.env.VITE_FUNCTIONS_REGION ?? 'us-central1',
};
