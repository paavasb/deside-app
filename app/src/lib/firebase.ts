import { initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { GoogleAuthProvider, connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions';
import { env } from './env';

/**
 * Firebase client singletons.
 *
 * The web configuration in `env` is public by design; it names the project but
 * grants nothing. All authorization lives in Firebase Auth, firestore.rules and the
 * callable functions.
 */

export const app: FirebaseApp = initializeApp(env.firebase);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const functions: Functions = getFunctions(app, env.functionsRegion);

export const googleProvider = new GoogleAuthProvider();
// Always let the user choose which Google account to use, instead of silently
// reusing whichever one the browser happens to be signed into.
googleProvider.setCustomParameters({ prompt: 'select_account' });

if (env.useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
} else if (env.recaptchaSiteKey) {
  // App Check is opt-in: it only initializes once a reCAPTCHA Enterprise site key
  // is configured, so the app still runs before App Check is registered. Enforce
  // it on the backend with APP_CHECK_ENFORCE=true (see docs/RUNBOOK.md).
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(env.recaptchaSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}
