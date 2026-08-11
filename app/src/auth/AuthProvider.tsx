import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { toAppError } from '@/lib/appError';
import { AuthContext, type AuthContextValue, type AuthStatus } from './AuthContext';

/**
 * Owns the Firebase Auth session.
 *
 * Session state is the single source of truth for routing: `loading` renders the
 * splash, `signedOut` renders the login screen, `signedIn` renders the app. v1
 * instead imperatively pushed history from an auth callback, which raced with the
 * router on refresh.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [signInError, setSignInError] = useState<string | null>(null);

  useEffect(() => {
    // Completes a redirect-based sign-in (the fallback when popups are blocked).
    // Failures here are surfaced but must not block rendering.
    getRedirectResult(auth).catch((error: unknown) => {
      setSignInError(toAppError(error).message);
    });

    return onAuthStateChanged(
      auth,
      (nextUser) => {
        setUser(nextUser);
        setStatus(nextUser ? 'signedIn' : 'signedOut');
      },
      (error) => {
        setSignInError(toAppError(error).message);
        setStatus('signedOut');
      },
    );
  }, []);

  const signIn = useCallback(async () => {
    setSignInError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const code = error instanceof Error && 'code' in error ? String(error.code) : '';
      // Popups are blocked in some mobile and embedded browsers; fall back to a
      // full-page redirect rather than dead-ending the only way into the app.
      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/operation-not-supported-in-this-environment'
      ) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      // The user closing the popup is a normal action, not an error worth showing.
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return;
      }
      setSignInError(toAppError(error).message);
    }
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, signInError, signIn, signOut }),
    [status, user, signInError, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
