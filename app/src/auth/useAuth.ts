import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from './AuthContext';

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>.');
  }
  return context;
}

/** The signed-in user's UID. Throws if called outside an authenticated route. */
export function useUid(): string {
  const { user } = useAuth();
  if (!user) {
    throw new Error('useUid must be used inside an authenticated route.');
  }
  return user.uid;
}
