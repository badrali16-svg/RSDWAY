import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useGetAuthConfig,
  useSaveAuthConfig,
  useUnlockSettings,
  useTestConnection,
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Save,
  Loader2,
  ShieldCheck,
  Lock,
  Wifi,
  WifiOff,
  FlaskConical,
  Globe,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const PROD_URL = "https://rsd.sfda.gov.sa/ws";
const TEST_URL = "https://tandttest.sfda.gov.sa/ws";

const formSchema = z.object({
  username: z.string().min(1, "اسم المستخدم مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
  baseUrl: z.string().url("يجب أن يكون رابطاً صحيحاً").min(1, "رابط النظام مطلوب"),
});

type ConnectionStatus = {
  success: boolean;
  message: string;
  environment?: string;
  baseUrl?: string;
  testedAt: string;
} | null;

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
  const testConn = useTestConnection();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      baseUrl: TEST_URL,
    },
  });

  useEffect(() => {
    if (authConfig) {
      form.reset({
        username: authConfig.username || "",
        password: authConfig.hasPassword ? "********" : "",
        baseUrl: authConfig.baseUrl || TEST_URL,
      });
    }
  }, [authConfig, form]);

  const currentBaseUrl = form.watch("baseUrl");
  const isTestEnv =
    !currentBaseUrl ||
    currentBaseUrl.includes("tandttest") ||
    currentBaseUrl.includes("test");

  const handleEnvSelect = (env: "prod" | "test") => {
    form.setValue("baseUrl", env === "prod" ? PROD_URL : TEST_URL, {
      shouldValidate: true,
    });
    setConnectionStatus(null);
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setConnectionStatus(null);
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

  const handleTestConnection = () => {
    setConnectionStatus(null);
    testConn.mutate(undefined, {
      onSuccess: (data) => {
        setConnectionStatus({
          success: data.success,
          message: data.message,
          environment: data.environment,
          baseUrl: data.baseUrl,
          testedAt: data.testedAt,
        });
      },
      onError: () => {
        setConnectionStatus({
          success: false,
          message: "حدث خطأ أثناء اختبار الاتصال",
          testedAt: new Date().toISOString(),
        });
      },
    });
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("ar-SA", {
        dateStyle: "short",
        timeStyle: "medium",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">الإعدادات</h1>
        <p className="text-muted-foreground mt-1">إعدادات الربط مع نظام رصد (DTTS) والتفويض</p>
      </div>

      {/* ── Connection Status Banner ─────────────────────────────────────── */}
      {connectionStatus && (
        <Card
          className={`border-2 ${connectionStatus.success ? "border-green-500 bg-green-50" : "border-destructive bg-red-50"}`}
        >
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              {connectionStatus.success ? (
                <CheckCircle2 className="h-6 w-6 text-green-600 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="h-6 w-6 text-destructive mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p
                  className={`font-semibold ${connectionStatus.success ? "text-green-800" : "text-destructive"}`}
                >
                  {connectionStatus.success ? "الاتصال ناجح ✓" : "فشل الاتصال ✗"}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">{connectionStatus.message}</p>
                {connectionStatus.environment && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="font-medium">البيئة:</span> {connectionStatus.environment}
                  </p>
                )}
                {connectionStatus.baseUrl && (
                  <p className="text-xs text-muted-foreground font-mono mt-0.5 break-all">
                    {connectionStatus.baseUrl}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(connectionStatus.testedAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Environment Selector ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">اختيار البيئة</CardTitle>
          <CardDescription>
            حدد البيئة التي تريد الاتصال بها — الاختبار للتجربة والإنتاج للعمل الفعلي
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Test Environment */}
            <button
              type="button"
              onClick={() => handleEnvSelect("test")}
              className={`relative flex items-start gap-3 rounded-lg border-2 p-4 text-right transition-all hover:bg-muted/50 ${
                isTestEnv
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
            >
              <FlaskConical
                className={`h-6 w-6 shrink-0 mt-0.5 ${isTestEnv ? "text-primary" : "text-muted-foreground"}`}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`font-semibold ${isTestEnv ? "text-primary" : ""}`}>
                    البيئة الافتراضية (Test)
                  </p>
                  {isTestEnv && (
                    <Badge variant="default" className="text-xs">
                      محدد
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 break-all font-mono">
                  {TEST_URL}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  للاختبار والتطوير بدون التأثير على البيانات الحقيقية
                </p>
              </div>
            </button>

            {/* Production Environment */}
            <button
              type="button"
              onClick={() => handleEnvSelect("prod")}
              className={`relative flex items-start gap-3 rounded-lg border-2 p-4 text-right transition-all hover:bg-muted/50 ${
                !isTestEnv
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
            >
              <Globe
                className={`h-6 w-6 shrink-0 mt-0.5 ${!isTestEnv ? "text-primary" : "text-muted-foreground"}`}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`font-semibold ${!isTestEnv ? "text-primary" : ""}`}>
                    بيئة الإنتاج (Production)
                  </p>
                  {!isTestEnv && (
                    <Badge variant="default" className="text-xs">
                      محدد
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 break-all font-mono">
                  {PROD_URL}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  للعمل الفعلي مع الهيئة العامة للغذاء والدواء (SFDA)
                </p>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ── Credentials Form ─────────────────────────────────────────────── */}
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
                      <FormDescription>
                        يمكنك اختيار البيئة من الأزرار أعلاه أو كتابة رابط مخصص
                      </FormDescription>
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
                          <Input
                            dir="ltr"
                            className="text-left"
                            type="password"
                            placeholder="********"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={saveAuth.isPending}>
                    {saveAuth.isPending ? (
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="ml-2 h-4 w-4" />
                    )}
                    حفظ الإعدادات
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={testConn.isPending || !authConfig?.hasPassword}
                  >
                    {testConn.isPending ? (
                      <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                    ) : connectionStatus?.success ? (
                      <Wifi className="ml-2 h-4 w-4 text-green-600" />
                    ) : connectionStatus && !connectionStatus.success ? (
                      <WifiOff className="ml-2 h-4 w-4 text-destructive" />
                    ) : (
                      <Wifi className="ml-2 h-4 w-4" />
                    )}
                    اختبار الاتصال
                  </Button>
                </div>

                {!authConfig?.hasPassword && (
                  <p className="text-xs text-muted-foreground">
                    يرجى حفظ البيانات أولاً قبل اختبار الاتصال
                  </p>
                )}
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
