import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { getGetCurrentSessionQueryKey, useGetCurrentSession } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/use-language";

export interface SessionUser {
  id: number;
  username: string;
  role: "admin" | "client";
  permissions: string[];
}

interface AuthContextValue {
  user: SessionUser | null;
  isLoading: boolean;
  sessionReplaced: boolean;
  refresh: () => Promise<unknown>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const replacementHandledRef = useRef(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  const { data, error, isLoading, refetch } = useGetCurrentSession({
    query: {
      queryKey: getGetCurrentSessionQueryKey(),
      retry: false,
      refetchInterval: 10_000,
      refetchIntervalInBackground: true,
      refetchOnWindowFocus: true,
      staleTime: 0,
    },
    request: {
      cache: "no-store",
    },
  });

  const rawData = data as { user?: SessionUser | null } | undefined;
  const errorData = (error as { data?: { code?: string } } | null)?.data;
  const sessionReplaced = errorData?.code === "SESSION_REPLACED";
  const user = sessionReplaced ? null : (rawData?.user ?? null) as SessionUser | null;

  useEffect(() => {
    if (!sessionReplaced || replacementHandledRef.current) return;
    replacementHandledRef.current = true;
    toast({
      title: t("login.sessionReplaced"),
      variant: "destructive",
    });
  }, [sessionReplaced, t, toast]);

  return (
    <AuthContext.Provider value={{ user, isLoading, sessionReplaced, refresh: refetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
