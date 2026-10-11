import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { isFirebaseConfigured, loadFirebaseAuth } from '../services/firebase';
import type { AppUser } from '../types';

const DEMO_USER_KEY = 'letmeask.demo.user.v1';

interface AuthContextValue {
  user: AppUser | null;
  ready: boolean;
  signInWithGoogle: () => Promise<void>;
  enterDemo: (displayName: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readDemoUser(): AppUser | null {
  try {
    const value = localStorage.getItem(DEMO_USER_KEY);
    if (!value) return null;
    return JSON.parse(value) as AppUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => isFirebaseConfigured ? null : readDemoUser());
  const [ready, setReady] = useState(!isFirebaseConfigured);

  useEffect(() => {
    if (isFirebaseConfigured) {
      let unsubscribe: (() => void) | undefined;
      let cancelled = false;
      void loadFirebaseAuth().then(({ auth, sdk }) => {
        if (cancelled) return;
        unsubscribe = sdk.onAuthStateChanged(auth, (firebaseUser) => {
          setUser(firebaseUser ? {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName?.slice(0, 60) || 'Pessoa participante',
            photoURL: firebaseUser.photoURL,
            isDemo: false,
          } : null);
          setReady(true);
        }, () => setReady(true));
      }).catch(() => setReady(true));
      return () => {
        cancelled = true;
        unsubscribe?.();
      };
    }

    const syncDemoUser = () => setUser(readDemoUser());
    window.addEventListener('storage', syncDemoUser);
    return () => window.removeEventListener('storage', syncDemoUser);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    ready,
    async signInWithGoogle() {
      const { auth, sdk } = await loadFirebaseAuth();
      await sdk.signInWithPopup(auth, new sdk.GoogleAuthProvider());
    },
    enterDemo(displayName) {
      if (isFirebaseConfigured) return;
      const demoUser: AppUser = {
        uid: `demo-${crypto.randomUUID()}`,
        displayName: displayName.trim(),
        photoURL: null,
        isDemo: true,
      };
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
      setUser(demoUser);
      setReady(true);
    },
    async logout() {
      if (isFirebaseConfigured) {
        const { auth, sdk } = await loadFirebaseAuth();
        await sdk.signOut(auth);
      } else {
        localStorage.removeItem(DEMO_USER_KEY);
      }
      setUser(null);
    },
  }), [ready, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa estar dentro de AuthProvider.');
  return context;
}
