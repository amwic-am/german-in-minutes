import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SessionUser } from "@shared/types";
import { api } from "@/lib/api";

type AuthValue = {
  user: SessionUser | null;
  loading: boolean;
  isStaff: boolean;
  login: (email: string, password: string) => Promise<SessionUser>;
  register: (input: {
    fullName: string;
    email: string;
    password: string;
    level?: string;
    learningGoal?: string;
    dailyGoalMinutes?: number;
  }) => Promise<SessionUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => (await api.get<{ user: SessionUser | null }>("/auth/me")).user,
    staleTime: 20_000,
  });

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await api.post<{ user: SessionUser }>("/auth/login", { email, password });
      queryClient.setQueryData(["auth", "me"], result.user);
      await queryClient.invalidateQueries();
      return result.user;
    },
    [queryClient],
  );

  const register = useCallback(
    async (input: {
      fullName: string;
      email: string;
      password: string;
      level?: string;
      learningGoal?: string;
      dailyGoalMinutes?: number;
    }) => {
      const result = await api.post<{ user: SessionUser }>("/auth/register", input);
      queryClient.setQueryData(["auth", "me"], result.user);
      await queryClient.invalidateQueries();
      return result.user;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    queryClient.setQueryData(["auth", "me"], null);
    await queryClient.cancelQueries();
    queryClient.clear();
    queryClient.setQueryData(["auth", "me"], null);
  }, [queryClient]);

  const refresh = useCallback(async () => {
    const result = await api.get<{ user: SessionUser | null }>("/auth/me");
    queryClient.setQueryData(["auth", "me"], result.user);
  }, [queryClient]);

  const value = useMemo<AuthValue>(
    () => ({
      user: query.data ?? null,
      loading: query.isLoading,
      isStaff: Boolean(query.data && query.data.roles.length > 0),
      login,
      register,
      logout,
      refresh,
    }),
    [query.data, query.isLoading, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
