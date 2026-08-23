import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  clearSession,
  loadSession,
  saveSession,
  updateStoredUser,
} from '@/services/authService';
import type { AuthSession, AuthUser } from '@/types/auth';

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  completeLogin: (session: AuthSession, remember: boolean) => Promise<void>;
  updateCurrentUser: (user: AuthUser) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<AuthUser>) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    loadSession()
      .then((session) => {
        if (!isMounted || !session) {
          return;
        }

        setUser(session.user);
        setToken(session.token);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const completeLogin = useCallback(async (session: AuthSession, remember: boolean) => {
    setUser(session.user);
    setToken(session.token);

    if (remember) {
      await saveSession(session);
      return;
    }

    await clearSession();
  }, []);

  const updateCurrentUser = useCallback(async (updatedUser: AuthUser) => {
    setUser(updatedUser);
    await updateStoredUser(updatedUser);
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
    setToken(null);
    await clearSession();
  }, []);

  const updateUser = useCallback(async (updates: Partial<AuthUser>) => {
    if (!user) {
      return;
    }

    const updatedUser = {
      ...user,
      ...updates,
    };

    setUser(updatedUser);
    await updateStoredUser(updatedUser);
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      completeLogin,
      updateCurrentUser,
      signOut,
      updateUser,
    }),
    [completeLogin, isLoading, signOut, token, updateCurrentUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
