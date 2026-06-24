import { createContext, useContext, type ReactNode } from "react";
import { useGetCurrentSession } from "@workspace/api-client-react";

export interface SessionUser {
  id: number;
  username: string;
  role: "admin" | "client";
  permissions: string[];
}

interface AuthContextValue {
  user: SessionUser | null;
  isLoading: boolean;
  refresh: () => Promise<unknown>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, refetch } = useGetCurrentSession();

  const rawData = data as { user?: SessionUser | null } | undefined;
  const user = (rawData?.user ?? null) as SessionUser | null;

  return (
    <AuthContext.Provider value={{ user, isLoading, refresh: refetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
