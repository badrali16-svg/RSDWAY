import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  Home,
  Settings,
  History,
  Package,
  Truck,
  RotateCcw,
  Repeat,
  Ban,
  Box,
  Search,
  Menu,
  Users,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { useLogout, getGetCurrentSessionQueryKey } from "@workspace/api-client-react";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  slug: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: "/", label: "لوحة القيادة", icon: Home, slug: "dashboard" },
  { href: "/import", label: "الاستيراد والتصنيع", icon: Package, slug: "import" },
  { href: "/dispatch", label: "الإرسال والاستلام", icon: Truck, slug: "dispatch" },
  { href: "/return", label: "الإرجاع والاستهلاك", icon: RotateCcw, slug: "return" },
  { href: "/transfer", label: "النقل وصرف الصيدليات", icon: Repeat, slug: "transfer" },
  { href: "/deactivation", label: "التعطيل والتصدير", icon: Ban, slug: "deactivation" },
  { href: "/packages", label: "نقل الحزم", icon: Box, slug: "packages" },
  { href: "/queries", label: "خدمات الاستعلام", icon: Search, slug: "queries" },
  { href: "/history", label: "سجل العمليات", icon: History, slug: "history" },
  { href: "/users", label: "إدارة المستخدمين", icon: Users, slug: "users", adminOnly: true },
  { href: "/settings", label: "الإعدادات", icon: Settings, slug: "settings" },
];

const ALWAYS_VISIBLE = new Set(["settings"]);

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const logout = useLogout();

  const visibleItems = navItems.filter((item) => {
    if (item.adminOnly) return user?.role === "admin";
    if (ALWAYS_VISIBLE.has(item.slug)) return true;
    if (user?.role === "admin") return true;
    return user?.permissions?.includes(item.slug);
  });

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: async () => {
        await qc.invalidateQueries({ queryKey: getGetCurrentSessionQueryKey() });
        window.location.href = import.meta.env.BASE_URL || "/";
      },
    });
  };

  const NavLinks = () => (
    <nav className="space-y-1 p-4">
      {visibleItems.map((item) => {
        const isActive = location === item.href;
        return (
          <Link key={item.href} href={item.href}>
            <div
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </div>
          </Link>
        );
      })}
    </nav>
  );

  const UserBlock = () => (
    <div className="border-t p-4 space-y-2">
      {user && (
        <div className="text-xs text-muted-foreground">
          مسجّل كـ <span className="font-semibold text-foreground">{user.username}</span>
          {user.role === "admin" && <span className="mr-1">(مدير)</span>}
        </div>
      )}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleLogout}
        disabled={logout.isPending}
      >
        <LogOut className="ml-2 h-4 w-4" />
        تسجيل الخروج
      </Button>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-background font-sans" dir="rtl">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 border-l bg-card md:flex md:flex-col">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/">
            <div className="flex items-center gap-2 font-bold text-primary cursor-pointer text-lg">
              <Box className="h-6 w-6" />
              <span>نظام رصد (DTTS)</span>
            </div>
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <UserBlock />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:hidden">
          <Link href="/">
            <div className="flex items-center gap-2 font-bold text-primary cursor-pointer">
              <Box className="h-5 w-5" />
              <span>نظام رصد</span>
            </div>
          </Link>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 p-0 flex flex-col">
              <div className="flex h-16 items-center border-b px-6">
                <span className="font-bold text-primary">القائمة</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                <NavLinks />
              </div>
              <UserBlock />
            </SheetContent>
          </Sheet>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-muted/30">
          <div className="mx-auto max-w-6xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
