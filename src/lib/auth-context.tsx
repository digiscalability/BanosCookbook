'use client';

import {
  browserPopupRedirectResolver,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { auth } from './firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<User>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Mirrors the Firebase sign-in into the httpOnly `__session` cookie so middleware,
 * route handlers and server actions can see who is calling. The readable
 * `bc_session_uid` marker avoids re-minting a cookie on every page load.
 */
async function syncServerSession(firebaseUser: User | null): Promise<void> {
  const marker = document.cookie
    .split('; ')
    .find(c => c.startsWith('bc_session_uid='))
    ?.slice('bc_session_uid='.length);
  try {
    if (!firebaseUser) {
      if (marker) await fetch('/api/auth/session', { method: 'DELETE' });
      return;
    }
    if (marker === firebaseUser.uid) return;
    const idToken = await firebaseUser.getIdToken();
    await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
  } catch (err) {
    console.warn('Session sync failed', err);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      void syncServerSession(firebaseUser);
    });
    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await syncServerSession(cred.user);
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(newUser, { displayName });
    await syncServerSession(newUser);
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<User> => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    await syncServerSession(result.user);
    return result.user;
  }, []);

  const signOut = useCallback(async () => {
    await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => undefined);
    await firebaseSignOut(auth);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
