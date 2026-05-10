import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useGetAuthConfig,
  useSaveAuthConfig,
  useUnlockSettings,
  useTestConnection,
  useListApiKeys,
  useCreateApiKey,
  useDeleteApiKey,
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
  Key,
  Plus,
  Trash2,
  Copy,
  AlertTriangle,
  Plug,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { useLanguage } from "@/lib/language-context";

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
  const { t } = useLanguage();

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
          setGateError(t("settings.gateWrongPassword"));
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
            <CardTitle>{t("settings.gateTitle")}</CardTitle>
            <CardDescription>{t("settings.gateDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUnlock} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gate-password">{t("settings.gatePasswordLabel")}</Label>
                <Input
                  id="gate-password"
                  type="password"
                  value={gatePassword}
                  onChange={(e) => setGatePassword(e.target.value)}
                  required
                  autoFocus
                />
                {gateError && <p className="text-sm text-destructive">{t("settings.gateWrongPassword")}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={unlock.isPending}>
                {unlock.isPending ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="me-2 h-4 w-4" />
                )}
                {t("settings.gateEnter")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <SettingsContent toast={toast} />;
}

// ── API Keys Section ──────────────────────────────────────────────────────────
function ApiKeysSection({ toast }: { toast: ReturnType<typeof useToast>["toast"] }) {
  const { data: keys = [], refetch } = useListApiKeys();
  const createKey = useCreateApiKey();
  const deleteKey = useDeleteApiKey();
  const { t } = useLanguage();
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<{ id: number; name: string; key: string } | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<number | null>(null);

  const baseUrl = window.location.origin;

  const handleCreate = () => {
    if (!newKeyName.trim()) return;
    createKey.mutate(
      { data: { name: newKeyName.trim() } },
      {
        onSuccess: (data) => {
          setCreatedKey({ id: data.id, name: data.name, key: data.key });
          setNewKeyName("");
          refetch();
        },
        onError: () => toast({ title: t("common.error"), description: t("settings.createErrDesc"), variant: "destructive" }),
      }
    );
  };

  const handleRevoke = (id: number) => {
    deleteKey.mutate(
      { id },
      {
        onSuccess: () => {
          setConfirmRevoke(null);
          refetch();
          toast({ title: t("settings.revokeOkTitle"), description: t("settings.revokeOkDesc") });
        },
        onError: () => toast({ title: t("settings.revokeErrTitle"), description: t("settings.revokeErrDesc"), variant: "destructive" }),
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Plug className="h-5 w-5 text-primary" />
          <CardTitle>{t("settings.apiKeysTitle")}</CardTitle>
        </div>
        <CardDescription>
          {t("settings.apiKeysDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Info box: how to use */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-sm">
          <p className="font-semibold flex items-center gap-2">
            <Key className="h-4 w-4 text-primary" />
            {t("settings.apiHowToUse")}
          </p>
          <p className="text-muted-foreground">{t("settings.apiAddHeader")}</p>
          <pre dir="ltr" className="bg-background border rounded px-3 py-2 text-xs font-mono overflow-x-auto">
{"X-API-Key: rsd_<your-key>"}
          </pre>
          <p className="text-muted-foreground">{t("settings.apiExample")}</p>
          <pre dir="ltr" className="bg-background border rounded px-3 py-2 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
{`POST ${baseUrl}/api/external/v1/dispatch
X-API-Key: rsd_<your-key>
Content-Type: application/json

{
  "toGLN": "5555555555554",
  "products": [
    { "GTIN": "74637840842700", "SN": "SN001", "BN": "BATCH01", "XD": "2026-12-31" }
  ]
}`}
          </pre>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground mb-1">{t("settings.apiOpsSN")}</p>
              <ul className="space-y-0.5 font-mono" dir="ltr">
                {["/external/v1/dispatch","/external/v1/dispatch-cancel","/external/v1/accept","/external/v1/accept-dispatch","/external/v1/return","/external/v1/transfer","/external/v1/transfer-cancel","/external/v1/import","/external/v1/supply"].map(ep => (
                  <li key={ep}>{ep}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">{t("settings.apiOpsBatch")}</p>
              <ul className="space-y-0.5 font-mono" dir="ltr">
                {["/external/v1/dispatch-batch","/external/v1/dispatch-cancel-batch","/external/v1/accept-batch","/external/v1/return-batch","/external/v1/transfer-batch","/external/v1/transfer-cancel-batch"].map(ep => (
                  <li key={ep}>{ep}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-xs text-muted-foreground pt-1">
            <span className="font-semibold">{t("settings.apiOdooMapping")}</span> Receipt → accept | Delivery → dispatch | Return → return | Internal Transfer → transfer
          </p>
        </div>

        <Separator />

        {/* New key created — show once */}
        {createdKey && (
          <div className="rounded-lg border-2 border-green-500 bg-green-50 dark:bg-green-900/20 p-4 space-y-3">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold">
              <CheckCircle2 className="h-5 w-5" />
              {t("settings.keyCreatedMsg")}
            </div>
            <div className="flex items-center gap-2">
              <code dir="ltr" className="flex-1 bg-background border rounded px-3 py-2 text-xs font-mono break-all">{createdKey.key}</code>
              <Button
                type="button" variant="outline" size="icon"
                onClick={() => { navigator.clipboard.writeText(createdKey.key); toast({ title: t("settings.copied") }); }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setCreatedKey(null)}>
              {t("settings.keyHide")}
            </Button>
          </div>
        )}

        {/* Create new key */}
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="key-name">{t("settings.keyNameLabel")}</Label>
            <Input
              id="key-name"
              placeholder="Odoo Warehouse Integration"
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
            />
          </div>
          <Button type="button" onClick={handleCreate} disabled={!newKeyName.trim() || createKey.isPending} className="gap-2">
            {createKey.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {t("settings.createKey")}
          </Button>
        </div>

        {/* Keys list */}
        {keys.length > 0 ? (
          <div className="space-y-2">
            <Label>{t("settings.currentKeys")}</Label>
            {keys.map(k => (
              <div key={k.id} className="flex items-center gap-3 rounded-lg border px-4 py-3">
                <Key className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{k.name}</p>
                  <p dir="ltr" className="text-xs text-muted-foreground font-mono">{k.keyPreview}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("settings.createdOn")} {new Date(k.createdAt).toLocaleDateString("ar-SA")}
                    {k.lastUsedAt && ` · ${t("settings.lastUsed")} ${new Date(k.lastUsedAt).toLocaleDateString("ar-SA")}`}
                  </p>
                </div>
                <Badge variant={k.enabled ? "default" : "secondary"} className="text-xs shrink-0">
                  {k.enabled ? t("settings.keyActive") : t("settings.keyDisabled")}
                </Badge>
                {confirmRevoke === k.id ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />{t("settings.revokeConfirm")}
                    </span>
                    <Button type="button" size="sm" variant="destructive" onClick={() => handleRevoke(k.id)} disabled={deleteKey.isPending}>
                      {deleteKey.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : t("settings.revokeYes")}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmRevoke(null)}>{t("settings.revokeNo")}</Button>
                  </div>
                ) : (
                  <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive shrink-0" onClick={() => setConfirmRevoke(k.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">{t("settings.noKeys")}</p>
        )}
      </CardContent>
    </Card>
  );
}

function SettingsContent({ toast }: { toast: ReturnType<typeof useToast>["toast"] }) {
  const { data: authConfig, isLoading: authLoading } = useGetAuthConfig();
  const saveAuth = useSaveAuthConfig();
  const testConn = useTestConnection();
  const { t } = useLanguage();
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
            title: t("settings.savedOkTitle"),
            description: t("settings.savedOkDesc"),
          });
        },
        onError: () => {
          toast({
            title: t("settings.saveErrTitle"),
            description: t("settings.saveErrDesc"),
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
          message: t("settings.connErrMsg"),
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
        <h1 className="text-3xl font-bold tracking-tight text-primary">{t("settings.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("settings.subtitle")}</p>
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
                  {connectionStatus.success ? t("settings.connSuccess") : t("settings.connFailed")}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">{connectionStatus.message}</p>
                {connectionStatus.environment && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="font-medium">{t("settings.envLabel")}</span> {connectionStatus.environment}
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
          <CardTitle className="text-lg">{t("settings.envTitle")}</CardTitle>
          <CardDescription>
            {t("settings.envDesc")}
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
                    {t("settings.testEnvName")}
                  </p>
                  {isTestEnv && (
                    <Badge variant="default" className="text-xs">
                      {t("settings.selected")}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 break-all font-mono">
                  {TEST_URL}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("settings.testEnvDesc")}
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
                    {t("settings.prodEnvName")}
                  </p>
                  {!isTestEnv && (
                    <Badge variant="default" className="text-xs">
                      {t("settings.selected")}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 break-all font-mono">
                  {PROD_URL}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("settings.prodEnvDesc")}
                </p>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ── External Integration / API Keys ──────────────────────────────── */}
      <ApiKeysSection toast={toast} />

      {/* ── Credentials Form ─────────────────────────────────────────────── */}
      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle>{t("settings.credTitle")}</CardTitle>
          </div>
          <CardDescription>
            {t("settings.credDesc")}
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
                      <FormLabel>{t("settings.baseUrlLabel")}</FormLabel>
                      <FormControl>
                        <Input dir="ltr" className="text-left" placeholder="https://..." {...field} />
                      </FormControl>
                      <FormDescription>
                        {t("settings.baseUrlDesc")}
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
                        <FormLabel>{t("settings.usernameLabel")}</FormLabel>
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
                        <FormLabel>{t("settings.passwordLabel")}</FormLabel>
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
                    {t("settings.saveBtn")}
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
                    {t("settings.testConn")}
                  </Button>
                </div>

                {!authConfig?.hasPassword && (
                  <p className="text-xs text-muted-foreground">
                    {t("settings.saveFirstHint")}
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
