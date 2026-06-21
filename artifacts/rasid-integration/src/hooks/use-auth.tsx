import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useGetCurrentSession } from "@workspace/api-client-react";
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
  refresh: () => Promise<unknown>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_REPLACED_MESSAGES: Record<string, string> = {
  ar: "تم تسجيل الدخول من جهاز آخر. تم تسجيل خروجك تلقائياً.",
  en: "You were signed in from another device. You have been logged out.",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, refetch } = useGetCurrentSession();
  const { toast } = useToast();
  const { lang } = useLanguage();
  const shownRef = useRef(false);

  const rawData = data as { user?: SessionUser | null; reason?: string } | undefined;
  const user = (rawData?.user ?? null) as SessionUser | null;
  const reason = rawData?.reason;

  useEffect(() => {
    if (reason === "SESSION_REPLACED" && !shownRef.current) {
      shownRef.current = true;
      toast({
        title: lang === "ar" ? "انتهت الجلسة" : "Session Ended",
        description: SESSION_REPLACED_MESSAGES[lang] ?? SESSION_REPLACED_MESSAGES["ar"],
        variant: "destructive",
        duration: 6000,
      });
    }
    if (reason !== "SESSION_REPLACED") {
      shownRef.current = false;
    }
  }, [reason, lang, toast]);

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
