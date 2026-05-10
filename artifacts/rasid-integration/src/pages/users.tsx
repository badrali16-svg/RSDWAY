import { useState } from "react";
import {
  useListUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  getListUsersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, Trash2, Save, Users as UsersIcon, LayoutDashboard, Cog } from "lucide-react";
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

const NAV_PERMISSION_OPTIONS: { slug: string; label: string }[] = [
  { slug: "dashboard", label: "لوحة القيادة" },
  { slug: "import", label: "الاستيراد والتصنيع" },
  { slug: "dispatch", label: "الإرسال والاستلام" },
  { slug: "return", label: "الإرجاع والاستهلاك" },
  { slug: "transfer", label: "النقل وصرف الصيدليات" },
  { slug: "deactivation", label: "التعطيل والتصدير" },
  { slug: "packages", label: "نقل الحزم" },
  { slug: "queries", label: "خدمات الاستعلام" },
  { slug: "history", label: "سجل العمليات" },
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
  const qc = useQueryClient();
  const { data: users, isLoading } = useListUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const invalidate = () => qc.invalidateQueries({ queryKey: getListUsersQueryKey() });

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPermissions, setNewPermissions] = useState<string[]>(ALL_DEFAULT_PERMS);

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
    createUser.mutate(
      { data: { username: newUsername, password: newPassword, permissions: newPermissions } },
      {
        onSuccess: () => {
          toast({ title: "تم إنشاء الحساب", description: `تم إنشاء حساب العميل ${newUsername}` });
          setNewUsername("");
          setNewPassword("");
          setNewPermissions(ALL_DEFAULT_PERMS);
          invalidate();
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : "فشل إنشاء الحساب";
          toast({ title: "خطأ", description: msg, variant: "destructive" });
        },
      },
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">إدارة المستخدمين</h1>
        <p className="text-muted-foreground mt-1">
          إنشاء حسابات العملاء وتحديد الصلاحيات الجانبية والعمليات المسموح بها لكل حساب
        </p>
      </div>

      {/* Create new client */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <CardTitle>إنشاء حساب عميل جديد</CardTitle>
          </div>
          <CardDescription>
            حدّد العناصر الجانبية والعمليات التي يستطيع هذا العميل استخدامها
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-username">اسم المستخدم</Label>
                <Input
                  id="new-username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">كلمة المرور</Label>
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
                العناصر الجانبية المسموح بها
              </Label>
              <p className="text-xs text-muted-foreground">الصفحات المرتبطة بالعمليات (مثل الاستيراد والإرسال) تظهر تلقائياً عند تفعيل أي عملية منها.</p>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 rounded-md border p-4">
                {MANUAL_NAV_OPTIONS.map((opt) => (
                  <label key={opt.slug} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={newPermissions.includes(opt.slug)}
                      onCheckedChange={() => toggleNewPerm(opt.slug)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Op permissions */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Cog className="h-4 w-4 text-primary" />
                العمليات المسموح بها
              </Label>
              <div className="space-y-3 rounded-md border p-4">
                {OP_PERMISSION_GROUPS.map((group) => {
                  const groupSlugs = group.ops.map((o) => o.slug);
                  const allChecked = groupSlugs.every((s) => newPermissions.includes(s));
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

            <Button type="submit" disabled={createUser.isPending}>
              {createUser.isPending ? (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="ml-2 h-4 w-4" />
              )}
              إنشاء الحساب
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Existing users */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-primary" />
            <CardTitle>الحسابات الحالية</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !users || users.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد حسابات.</p>
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
                          toast({ title: "تم الحفظ", description: `تم تحديث ${u.username}` });
                          invalidate();
                        },
                        onError: () =>
                          toast({
                            title: "خطأ",
                            description: "فشل الحفظ",
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
                          toast({ title: "تم الحذف" });
                          invalidate();
                        },
                        onError: () =>
                          toast({
                            title: "خطأ",
                            description: "فشل الحذف",
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
            {isAdmin ? "مدير" : "عميل"}
          </Badge>
        </div>
        {!isAdmin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive">
                <Trash2 className="ml-1 h-4 w-4" />
                حذف
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir="rtl">
              <AlertDialogHeader>
                <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                <AlertDialogDescription>
                  سيتم حذف الحساب «{user.username}» نهائياً.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} disabled={deleting}>
                  حذف
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
              العناصر الجانبية
            </p>
            <p className="text-xs text-muted-foreground">الصفحات المرتبطة بالعمليات تظهر تلقائياً عند تفعيل أي عملية منها.</p>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 rounded-md bg-muted/30 border p-3">
              {MANUAL_NAV_OPTIONS.map((opt) => (
                <label key={opt.slug} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={perms.includes(opt.slug)}
                    onCheckedChange={() => toggle(opt.slug)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Op permissions */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Cog className="h-3.5 w-3.5" />
              العمليات المسموح بها
            </p>
            <div className="space-y-3 rounded-md bg-muted/30 border p-3">
              {OP_PERMISSION_GROUPS.map((group) => {
                const groupSlugs = group.ops.map((o) => o.slug);
                const allChecked = groupSlugs.every((s) => perms.includes(s));
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
              <Label htmlFor={`pwd-${user.id}`}>إعادة تعيين كلمة المرور (اختياري)</Label>
              <Input
                id={`pwd-${user.id}`}
                type="text"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="اتركه فارغاً للإبقاء على كلمة المرور الحالية"
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
              حفظ
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
