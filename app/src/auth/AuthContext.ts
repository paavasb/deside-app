import { createContext } from 'react';
import type { User } from 'firebase/auth';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  /** Error from the most recent sign-in attempt, for display on the login screen. */
  signInError: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

/**
 * The context lives in its own module so `AuthProvider.tsx` can export only a
 * component (which keeps Vite's fast refresh working) and the hooks can live beside
 * it without importing the provider.
 */
export const AuthContext = createContext<AuthContextValue | null>(null);
