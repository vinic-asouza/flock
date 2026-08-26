"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { opsApi, type OperatorUser } from "@/services/api";

interface OpsAuthContextValue {
  user: OperatorUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<OperatorUser>;
  logout: () => Promise<void>;
}

const OpsAuthContext = createContext<OpsAuthContextValue | undefined>(undefined);

export function OpsAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<OperatorUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const me = await opsApi.getMe();
        if (!cancelled) {
          setUser(me);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await opsApi.login(email, password);
    const nextUser = { id: result.id, email: result.email };
    setUser(nextUser);
    return nextUser;
  }, []);

  const logout = useCallback(async () => {
    await opsApi.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
    }),
    [user, isLoading, login, logout]
  );

  return (
    <OpsAuthContext.Provider value={value}>{children}</OpsAuthContext.Provider>
  );
}

export function useOpsAuth() {
  const context = useContext(OpsAuthContext);
  if (!context) {
    throw new Error("useOpsAuth must be used within OpsAuthProvider");
  }
  return context;
}
