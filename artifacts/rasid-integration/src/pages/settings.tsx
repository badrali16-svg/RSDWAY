import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useGetAuthConfig,
  useSaveAuthConfig,
  useUnlockSettings,
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, Loader2, ShieldCheck, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const formSchema = z.object({
  username: z.string().min(1, "اسم المستخدم مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
  baseUrl: z.string().url("يجب أن يكون رابطاً صحيحاً").min(1, "رابط النظام مطلوب"),
});

export default function Settings() {
  const [unlocked, setUnlocked] = useState(false);
  const [gatePassword, setGatePassword] = useState("");
  const [gateError, setGateError] = useState<string | null>(null);
  const unlock = useUnlockSettings();
  const { toast } = useToast();

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setGateError(null);
    unlock.mutate(
      { data: { password: gatePassword } },
      {
        onSuccess: () => {
          setUnlocked(true);
          setGatePassword("");
        },
        onError: () => {
          setGateError("كلمة المرور غير صحيحة");
        },
      },
    );
  };

  if (!unlocked) {
    return (
      <div className="flex justify-center pt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>صفحة محمية</CardTitle>
            <CardDescription>
              يرجى إدخال كلمة المرور للدخول إلى صفحة الإعدادات
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUnlock} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gate-password">كلمة المرور</Label>
                <Input
                  id="gate-password"
                  type="password"
                  value={gatePassword}
                  onChange={(e) => setGatePassword(e.target.value)}
                  required
                  autoFocus
                />
                {gateError && <p className="text-sm text-destructive">{gateError}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={unlock.isPending}>
                {unlock.isPending ? (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="ml-2 h-4 w-4" />
                )}
                دخول
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <SettingsContent toast={toast} />;
}

function SettingsContent({ toast }: { toast: ReturnType<typeof useToast>["toast"] }) {
  const { data: authConfig, isLoading: authLoading } = useGetAuthConfig();
  const saveAuth = useSaveAuthConfig();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      baseUrl: "https://rsd.sfda.gov.sa/ws/dtws",
    },
  });

  useEffect(() => {
    if (authConfig) {
      form.reset({
        username: authConfig.username || "",
        password: authConfig.hasPassword ? "********" : "",
        baseUrl: authConfig.baseUrl || "https://rsd.sfda.gov.sa/ws/dtws",
      });
    }
  }, [authConfig, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    saveAuth.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast({
            title: "تم الحفظ بنجاح",
            description: "تم تحديث بيانات الاعتماد لنظام رصد",
          });
        },
        onError: () => {
          toast({
            title: "خطأ في الحفظ",
            description: "حدث خطأ أثناء محاولة حفظ البيانات",
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">الإعدادات</h1>
        <p className="text-muted-foreground mt-1">إعدادات الربط مع نظام رصد والتفويض</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle>بيانات اعتماد نظام رصد (DTTS)</CardTitle>
          </div>
          <CardDescription>
            أدخل بيانات حسابك لدى الهيئة العامة للغذاء والدواء لتتمكن من إرسال العمليات.
            يتم تخزين كلمة المرور بشكل مشفر وآمن.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {authLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="baseUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رابط الخدمة (Base URL)</FormLabel>
                      <FormControl>
                        <Input dir="ltr" className="text-left" placeholder="https://..." {...field} />
                      </FormControl>
                      <FormDescription>الرابط الافتراضي: https://rsd.sfda.gov.sa/ws/dtws</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم المستخدم (Username)</FormLabel>
                        <FormControl>
                          <Input dir="ltr" className="text-left" placeholder="GLN_..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>كلمة المرور (Password)</FormLabel>
                        <FormControl>
                          <Input dir="ltr" className="text-left" type="password" placeholder="********" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" disabled={saveAuth.isPending} className="w-full sm:w-auto">
                  {saveAuth.isPending ? (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="ml-2 h-4 w-4" />
                  )}
                  حفظ الإعدادات
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
