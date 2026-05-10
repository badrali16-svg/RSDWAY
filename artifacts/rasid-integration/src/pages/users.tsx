import { useState } from "react";
import {
  useListUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useTestConnectionDirect,
  getListUsersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2, UserPlus, Trash2, Save, Users as UsersIcon,
  LayoutDashboard, Cog, ShieldCheck, Globe, CheckCircle2, XCircle, Wifi,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { OP_PERMISSION_GROUPS, ALL_OP_SLUGS } from "@/lib/op-permissions";
import { useLanguage } from "@/lib/language-context";

const PROD_URL = "https://rsd.sfda.gov.sa/ws";

type DttsTestStatus = "idle" | "testing" | "success" | "failed";

const NAV_PERMISSION_OPTIONS: { slug: string }[] = [
  { slug: "dashboard" },
  { slug: "import" },
  { slug: "dispatch" },
  { slug: "return" },
  { slug: "transfer" },
  { slug: "deactivation" },
  { slug: "packages" },
  { slug: "queries" },
  { slug: "history" },
  { slug: "clients" },
];

// Nav slugs that are auto-derived from op groups (not manually controlled)
const AUTO_NAV_SLUGS = new Set(OP_PERMISSION_GROUPS.map((g) => g.navSlug));
// Only these nav items are shown in the manual nav section
const MANUAL_NAV_OPTIONS = NAV_PERMISSION_OPTIONS.filter((opt) => !AUTO_NAV_SLUGS.has(opt.slug));

// After any op toggle, auto-sync the corresponding navSlug:
// - if any op in a group is enabled → add navSlug
// - if all ops in a group are disabled → remove navSlug
function syncNavSlugs(perms: string[]): string[] {
  let result = [...perms];
  for (const group of OP_PERMISSION_GROUPS) {
    const anyEnabled = group.ops.some((o) => result.includes(o.slug));
    if (anyEnabled && !result.includes(group.navSlug)) {
      result = [...result, group.navSlug];
    } else if (!anyEnabled) {
      result = result.filter((s) => s !== group.navSlug);
    }
  }
  return result;
}

const ALL_NAV_SLUGS = NAV_PERMISSION_OPTIONS.map((p) => p.slug);
const ALL_DEFAULT_PERMS = [...ALL_NAV_SLUGS, ...ALL_OP_SLUGS];

export default function UsersPage() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const { data: users, isLoading } = useListUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const testConnectionDirect = useTestConnectionDirect();

  const invalidate = () => qc.invalidateQueries({ queryKey: getListUsersQueryKey() });

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPermissions, setNewPermissions] = useState<string[]>(ALL_DEFAULT_PERMS);

  // DTTS credentials state
  const [dttsUsername, setDttsUsername] = useState("");
  const [dttsPassword, setDttsPassword] = useState("");
  const [dttsUseCustomUrl, setDttsUseCustomUrl] = useState(false);
  const [dttsCustomUrl, setDttsCustomUrl] = useState("");
  const [dttsTestStatus, setDttsTestStatus] = useState<DttsTestStatus>("idle");
  const [dttsTestMessage, setDttsTestMessage] = useState("");

  const dttsBaseUrl = dttsUseCustomUrl ? dttsCustomUrl : PROD_URL;
  const dttsIsFilled = !!dttsUsername && !!dttsPassword && !!dttsBaseUrl;
  const dttsIsPartial = (!!dttsUsername || !!dttsPassword) && !dttsIsFilled;
  const canCreate =
    !createUser.isPending &&
    !dttsIsPartial &&
    (!dttsIsFilled || dttsTestStatus === "success");

  const resetDtts = () => {
    setDttsUsername("");
    setDttsPassword("");
    setDttsUseCustomUrl(false);
    setDttsCustomUrl("");
    setDttsTestStatus("idle");
    setDttsTestMessage("");
  };

  const handleDttsTest = () => {
    if (!dttsIsFilled) return;
    setDttsTestStatus("testing");
    setDttsTestMessage("");
    testConnectionDirect.mutate(
      { data: { username: dttsUsername, password: dttsPassword, baseUrl: dttsBaseUrl } },
      {
        onSuccess: (data) => {
          setDttsTestStatus(data.success ? "success" : "failed");
          setDttsTestMessage(data.message ?? "");
        },
        onError: () => {
          setDttsTestStatus("failed");
          setDttsTestMessage(t("settings.connErrMsg"));
        },
      },
    );
  };

  const toggleNewPerm = (slug: string) => {
    setNewPermissions((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
      return syncNavSlugs(next);
    });
  };

  // Toggle all ops in a group (also syncs navSlug automatically)
  const toggleGroupOps = (slugs: string[], checked: boolean, setter: (fn: (p: string[]) => string[]) => void) => {
    setter((prev) => {
      const next = checked ? [...new Set([...prev, ...slugs])] : prev.filter((s) => !slugs.includes(s));
      return syncNavSlugs(next);
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return;
    if (dttsIsPartial) {
      toast({ title: t("common.error"), description: t("users.dttsPartialFill"), variant: "destructive" });
      return;
    }
    if (dttsIsFilled && dttsTestStatus !== "success") {
      toast({ title: t("common.error"), description: t("users.dttsMustTest"), variant: "destructive" });
      return;
    }
    const payload: Parameters<typeof createUser.mutate>[0]["data"] = {
      username: newUsername,
      password: newPassword,
      permissions: newPermissions,
      ...(dttsIsFilled && dttsTestStatus === "success"
        ? { dttsConfig: { username: dttsUsername, password: dttsPassword, baseUrl: dttsBaseUrl } }
        : {}),
    };
    createUser.mutate(
      { data: payload },
      {
        onSuccess: () => {
          toast({ title: t("users.createdTitle"), description: `${t("users.createdDesc")} — ${newUsername}` });
          setNewUsername("");
          setNewPassword("");
          setNewPermissions(ALL_DEFAULT_PERMS);
          resetDtts();
          invalidate();
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : t("users.createErrFallback");
          toast({ title: t("common.error"), description: msg, variant: "destructive" });
        },
      },
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">{t("users.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("users.subtitle")}</p>
      </div>

      {/* Create new client */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <CardTitle>{t("users.createCardTitle")}</CardTitle>
          </div>
          <CardDescription>{t("users.createCardDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-username">{t("users.usernameLabel")}</Label>
                <Input
                  id="new-username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">{t("users.passwordLabel")}</Label>
                <Input
                  id="new-password"
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Nav permissions — only manually-controlled items */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4 text-primary" />
                {t("users.navPermsLabel")}
              </Label>
              <p className="text-xs text-muted-foreground">{t("users.navPermsHint")}</p>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 rounded-md border p-4">
                {MANUAL_NAV_OPTIONS.map((opt) => (
                  <label key={opt.slug} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={newPermissions.includes(opt.slug)}
                      onCheckedChange={() => toggleNewPerm(opt.slug)}
                    />
                    <span>{t(`nav.${opt.slug}` as Parameters<typeof t>[0])}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Op permissions */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Cog className="h-4 w-4 text-primary" />
                {t("users.opPermsLabel")}
              </Label>
              <div className="space-y-3 rounded-md border p-4">
                {OP_PERMISSION_GROUPS.map((group) => {
                  const groupSlugs = group.ops.map((o) => o.slug);
                  const someChecked = groupSlugs.some((s) => newPermissions.includes(s));
                  return (
                    <div key={group.group}>
                      <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer mb-2">
                        <Checkbox
                          checked={someChecked}
                          onCheckedChange={(c) => toggleGroupOps(groupSlugs, !!c, setNewPermissions)}
                        />
                        <span className="text-primary">{group.group}</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 pr-6">
                        {group.ops.map((op) => (
                          <label key={op.slug} className="flex items-center gap-2 text-xs cursor-pointer">
                            <Checkbox
                              checked={newPermissions.includes(op.slug)}
                              onCheckedChange={() => toggleNewPerm(op.slug)}
                            />
                            <span>{op.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── DTTS Credentials Section (Admin only, create mode) ── */}
            <Separator />
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base">{t("users.dttsTitle")}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{t("users.dttsDesc")}</p>
                  <p className="text-xs text-muted-foreground mt-1 italic">{t("users.dttsOptionalHint")}</p>
                </div>
              </div>

              {/* Production env indicator */}
              <div className="flex items-center gap-3 rounded-lg border-2 border-primary bg-primary/5 p-3">
                <Globe className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-primary">{t("settings.prodEnvName")}</span>
                    <Badge variant="default" className="text-xs">{t("settings.selected")}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5 break-all">
                    {dttsUseCustomUrl ? (dttsCustomUrl || PROD_URL) : PROD_URL}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDttsUseCustomUrl((v) => !v);
                    setDttsTestStatus("idle");
                    setDttsTestMessage("");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 shrink-0"
                >
                  {dttsUseCustomUrl ? t("settings.prodEnvName") : t("users.dttsCustomUrl")}
                </button>
              </div>

              {/* Custom URL input */}
              {dttsUseCustomUrl && (
                <div className="space-y-1.5">
                  <Label htmlFor="dtts-base-url">{t("settings.baseUrlLabel")}</Label>
                  <Input
                    id="dtts-base-url"
                    dir="ltr"
                    value={dttsCustomUrl}
                    onChange={(e) => {
                      setDttsCustomUrl(e.target.value);
                      setDttsTestStatus("idle");
                      setDttsTestMessage("");
                    }}
                    placeholder="https://rsd.sfda.gov.sa/ws"
                  />
                  <p className="text-xs text-muted-foreground">{t("settings.baseUrlDesc")}</p>
                </div>
              )}

              {/* Username + Password */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="dtts-username">{t("settings.usernameLabel")}</Label>
                  <Input
                    id="dtts-username"
                    dir="ltr"
                    value={dttsUsername}
                    onChange={(e) => {
                      setDttsUsername(e.target.value);
                      setDttsTestStatus("idle");
                      setDttsTestMessage("");
                    }}
                    placeholder="GLN_..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dtts-password">{t("settings.passwordLabel")}</Label>
                  <Input
                    id="dtts-password"
                    type="password"
                    dir="ltr"
                    value={dttsPassword}
                    onChange={(e) => {
                      setDttsPassword(e.target.value);
                      setDttsTestStatus("idle");
                      setDttsTestMessage("");
                    }}
                  />
                </div>
              </div>

              {/* Test connection row */}
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!dttsIsFilled || dttsTestStatus === "testing"}
                  onClick={handleDttsTest}
                >
                  {dttsTestStatus === "testing" ? (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wifi className="me-2 h-4 w-4" />
                  )}
                  {dttsTestStatus === "testing" ? t("users.dttsTesting") : t("settings.testConn")}
                </Button>

                {/* Status badge */}
                {dttsTestStatus === "success" && (
                  <div className="flex items-center gap-1.5 text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="font-medium">{t("users.dttsConnOk")}</span>
                  </div>
                )}
                {dttsTestStatus === "failed" && (
                  <div className="flex items-center gap-1.5 text-sm text-destructive">
                    <XCircle className="h-4 w-4 shrink-0" />
                    <span>{dttsTestMessage || t("users.dttsConnFail")}</span>
                  </div>
                )}
              </div>

              {/* Inline hints when create is blocked due to DTTS */}
              {dttsIsPartial && (
                <p className="text-xs text-destructive">{t("users.dttsPartialFill")}</p>
              )}
              {dttsIsFilled && dttsTestStatus === "idle" && (
                <p className="text-xs text-amber-600">{t("users.dttsMustTest")}</p>
              )}
              {dttsIsFilled && dttsTestStatus === "failed" && (
                <p className="text-xs text-destructive">{t("users.dttsTestFailed")}</p>
              )}
            </div>

            <Button type="submit" disabled={!canCreate}>
              {createUser.isPending ? (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="ml-2 h-4 w-4" />
              )}
              {t("users.createBtn")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Existing users */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-primary" />
            <CardTitle>{t("users.existingCard")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !users || users.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("users.noAccounts")}</p>
          ) : (
            <div className="space-y-4">
              {users.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  onUpdate={(payload) =>
                    updateUser.mutate(
                      { id: u.id, data: payload },
                      {
                        onSuccess: () => {
                          toast({ title: t("users.savedTitle"), description: `${t("users.savedDesc")} ${u.username}` });
                          invalidate();
                        },
                        onError: () =>
                          toast({
                            title: t("common.error"),
                            description: t("users.saveErrDesc"),
                            variant: "destructive",
                          }),
                      },
                    )
                  }
                  onDelete={() =>
                    deleteUser.mutate(
                      { id: u.id },
                      {
                        onSuccess: () => {
                          toast({ title: t("users.deletedTitle") });
                          invalidate();
                        },
                        onError: () =>
                          toast({
                            title: t("common.error"),
                            description: t("users.deleteErrDesc"),
                            variant: "destructive",
                          }),
                      },
                    )
                  }
                  saving={updateUser.isPending}
                  deleting={deleteUser.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface UserRowUser {
  id: number;
  username: string;
  role: "admin" | "client";
  permissions: string[];
}

function UserRow({
  user,
  onUpdate,
  onDelete,
  saving,
  deleting,
}: {
  user: UserRowUser;
  onUpdate: (data: { password: string | null; permissions: string[] }) => void;
  onDelete: () => void;
  saving: boolean;
  deleting: boolean;
}) {
  const [perms, setPerms] = useState<string[]>(user.permissions);
  const [pwd, setPwd] = useState("");
  const isAdmin = user.role === "admin";
  const { t } = useLanguage();

  const toggle = (slug: string) => {
    setPerms((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
      return syncNavSlugs(next);
    });
  };

  const toggleGroup = (slugs: string[], checked: boolean) => {
    setPerms((prev) => {
      const next = checked ? [...new Set([...prev, ...slugs])] : prev.filter((s) => !slugs.includes(s));
      return syncNavSlugs(next);
    });
  };

  return (
    <div className="rounded-md border p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{user.username}</span>
          <Badge variant={isAdmin ? "default" : "secondary"}>
            {isAdmin ? t("users.roleAdmin") : t("users.roleClient")}
          </Badge>
        </div>
        {!isAdmin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive">
                <Trash2 className="ml-1 h-4 w-4" />
                {t("users.deleteBtn")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir="rtl">
              <AlertDialogHeader>
                <AlertDialogTitle>{t("users.deleteDialogTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("users.deleteDialogDesc").replace("{username}", user.username)}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("users.deleteDialogCancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} disabled={deleting}>
                  {t("users.deleteDialogConfirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {!isAdmin && (
        <>
          {/* Nav permissions — only manually-controlled items */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <LayoutDashboard className="h-3.5 w-3.5" />
              {t("users.navSectionLabel")}
            </p>
            <p className="text-xs text-muted-foreground">{t("users.navSectionHint")}</p>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 rounded-md bg-muted/30 border p-3">
              {MANUAL_NAV_OPTIONS.map((opt) => (
                <label key={opt.slug} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={perms.includes(opt.slug)}
                    onCheckedChange={() => toggle(opt.slug)}
                  />
                  <span>{t(`nav.${opt.slug}` as Parameters<typeof t>[0])}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Op permissions */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Cog className="h-3.5 w-3.5" />
              {t("users.opSectionLabel")}
            </p>
            <div className="space-y-3 rounded-md bg-muted/30 border p-3">
              {OP_PERMISSION_GROUPS.map((group) => {
                const groupSlugs = group.ops.map((o) => o.slug);
                const someChecked = groupSlugs.some((s) => perms.includes(s));
                return (
                  <div key={group.group}>
                    <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer mb-1.5">
                      <Checkbox
                        checked={someChecked}
                        onCheckedChange={(c) => toggleGroup(groupSlugs, !!c)}
                      />
                      <span className="text-primary">{group.group}</span>
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3 pr-6">
                      {group.ops.map((op) => (
                        <label key={op.slug} className="flex items-center gap-2 text-xs cursor-pointer">
                          <Checkbox
                            checked={perms.includes(op.slug)}
                            onCheckedChange={() => toggle(op.slug)}
                          />
                          <span>{op.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Label htmlFor={`pwd-${user.id}`}>{t("users.resetPwdLabel")}</Label>
              <Input
                id={`pwd-${user.id}`}
                type="text"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder={t("users.resetPwdPlaceholder")}
              />
            </div>
            <Button
              onClick={() => {
                onUpdate({ password: pwd || null, permissions: perms });
                setPwd("");
              }}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="ml-2 h-4 w-4" />
              )}
              {t("users.savingBtn")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
