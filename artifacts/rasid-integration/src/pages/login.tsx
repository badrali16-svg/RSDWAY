import { useState } from "react";
import { useLogin, getGetCurrentSessionQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Box, Loader2, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();
  const qc = useQueryClient();
  const { toast } = useToast();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    login.mutate(
      { data: { username, password } },
      {
        onSuccess: async () => {
          await qc.invalidateQueries({ queryKey: getGetCurrentSessionQueryKey() });
          window.location.href = import.meta.env.BASE_URL || "/";
        },
        onError: () => {
          toast({
            title: "فشل تسجيل الدخول",
            description: "اسم المستخدم أو كلمة المرور غير صحيحة",
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <div
      dir="rtl"
      className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-muted/40 via-background to-muted/30 p-4 font-sans"
    >
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Box className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">نظام رصد (DTTS)</CardTitle>
          <CardDescription>يرجى تسجيل الدخول للمتابعة</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">اسم المستخدم</Label>
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
              <Label htmlFor="password">كلمة المرور</Label>
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
            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="ml-2 h-4 w-4" />
              )}
              تسجيل الدخول
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
