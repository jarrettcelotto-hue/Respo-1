import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { authApi, setAuthToken } from "../api/client";
import type { User } from "../api/types";

const TOKEN_KEY = "auth_token";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signup: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (token) {
          setAuthToken(token);
          const { user } = await authApi.me();
          setUser(user);
        }
      } catch {
        // stored token is invalid/expired -- fall through to logged-out state
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        setAuthToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleAuthResult(result: { token: string; user: User }) {
    await SecureStore.setItemAsync(TOKEN_KEY, result.token);
    setAuthToken(result.token);
    setUser(result.user);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signup: async (email, password) => handleAuthResult(await authApi.signup(email, password)),
      login: async (email, password) => handleAuthResult(await authApi.login(email, password)),
      logout: async () => {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        setAuthToken(null);
        setUser(null);
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
