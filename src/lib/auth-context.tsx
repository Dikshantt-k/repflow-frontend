"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "./api";
import { tokenStore } from "./tokenStore";
import type { AuthUser, Role } from "@/types/api";

export interface MeContext {
  userId: string;
  role: Role;
  orgId?: string;
  branchId?: string;
  org?: { name: string; city?: string; businessType: string; status: string; logoUrl?: string } | null;
  branch?: { name: string; code: string } | null;
}

interface AuthState {
  user: AuthUser | null;
  context: MeContext | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  setSession: (user: AuthUser, accessToken: string, refreshToken: string) => Promise<MeContext>;
  refresh: () => Promise<void>;
  logout: () => void;
}

const AuthReactContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, context: null, loading: true });
  const router = useRouter();

  const refresh = useCallback(async () => {
    if (!tokenStore.getAccessToken()) {
      setState({ user: null, context: null, loading: false });
      return;
    }
    try {
      const me = await authApi.me();
      setState({ user: me.user, context: me.context, loading: false });
    } catch {
      tokenStore.clear();
      setState({ user: null, context: null, loading: false });
    }
  }, []);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSession = useCallback(async (user: AuthUser, accessToken: string, refreshToken: string): Promise<MeContext> => {
    tokenStore.setTokens(accessToken, refreshToken);
    setState((s) => ({ ...s, user, loading: true }));
    const me = await authApi.me();
    setState({ user: me.user, context: me.context, loading: false });
    return me.context;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setState({ user: null, context: null, loading: false });
    router.push("/login");
  }, [router]);

  return (
    <AuthReactContext.Provider value={{ ...state, setSession, refresh, logout }}>{children}</AuthReactContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthReactContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
