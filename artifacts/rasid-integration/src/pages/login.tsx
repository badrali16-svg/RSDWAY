import { useState, useEffect } from "react";
import { useLogin, getGetCurrentSessionQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, LogIn, Languages, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/use-language";

const STORAGE_KEY = "rsdway_remembered";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const login = useLogin();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t, dir, lang, setLang } = useLanguage();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { username: u, password: p } = JSON.parse(saved) as { username: string; password: string };
        setUsername(u ?? "");
        setPassword(p ?? "");
        setRememberMe(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    if (!username || !password) {
      toast({ title: t("login.resetNeedCreds"), variant: "destructive" });
      return;
    }
    if (!window.confirm(t("login.resetConfirm"))) return;
    setResetting(true);
    try {
      const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
      const res = await fetch(`${base}/api/session/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: t("login.resetOk") });
      } else {
        toast({ title: t("login.resetErr"), variant: "destructive" });
      }
    } catch {
      toast({ title: t("login.resetErr"), variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    login.mutate(
      { data: { username, password } },
      {
        onSuccess: async () => {
          if (rememberMe) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ username, password }));
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
          await qc.invalidateQueries({ queryKey: getGetCurrentSessionQueryKey() });
          window.location.href = import.meta.env.BASE_URL || "/";
        },
        onError: (err: unknown) => {
          const status = (err as { response?: { status?: number } })?.response?.status;
          toast({
            title: t("login.failTitle"),
            description: status === 403 ? t("users.inactiveLoginErr") : t("login.failDesc"),
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <div
      dir={dir}
      className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-muted/40 via-background to-muted/30 p-4 font-sans"
    >
      {/* Language toggle */}
      <div className="absolute top-4 end-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLang(lang === "ar" ? "en" : "ar")}
          className="gap-1.5 text-xs"
        >
          <Languages className="h-3.5 w-3.5" />
          {lang === "ar" ? "English" : "العربية"}
        </Button>
      </div>

      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img
              src={`${import.meta.env.BASE_URL}logo-large.png`}
              alt="RSDWAY Logo"
              className="h-28 w-28 object-contain"
            />
          </div>
          <CardTitle className="text-2xl">{t("login.title")}</CardTitle>
          <CardDescription>{t("login.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t("login.username")}</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Admin"
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("login.password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
            {/* Remember me */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(v) => {
                  const checked = v === true;
                  setRememberMe(checked);
                  if (!checked) localStorage.removeItem(STORAGE_KEY);
                }}
              />
              <Label htmlFor="remember-me" className="text-sm font-normal cursor-pointer select-none">
                {lang === "ar" ? "تذكر بيانات الدخول" : "Remember login info"}
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              <span className="ms-2">{t("login.submit")}</span>
            </Button>

            {/* Emergency session reset button */}
            <div className="flex justify-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-destructive gap-1.5 h-7 px-3"
                onClick={handleReset}
                disabled={resetting}
              >
                {resetting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                {t("login.resetBtn")}
              </Button>
            </div>

            {/* Back to main site */}
            <div className="text-center pt-1">
              <a
                href="https://www.rsdway.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline underline-offset-2"
              >
                {lang === "ar" ? "العودة للصفحة الرئيسية" : "Back to main website"}
              </a>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="absolute bottom-0 w-full py-4 text-center space-y-1">
        <p className="text-xs text-muted-foreground">
          {lang === "ar" ? (
            <>
              إذا واجهتك مشكلة في تسجيل الدخول يمكنك التواصل مع الدعم الفني على البريد:{" "}
              <a href="mailto:Support@rsdway.com" className="text-primary underline underline-offset-2">
                Support@rsdway.com
              </a>
            </>
          ) : (
            <>
              If you have trouble logging in, contact support at:{" "}
              <a href="mailto:Support@rsdway.com" className="text-primary underline underline-offset-2">
                Support@rsdway.com
              </a>
            </>
          )}
        </p>
        <p className="text-xs text-muted-foreground/70">
          Copyright © RSDWAY.COM 2026
        </p>
      </div>
    </div>
  );
}
