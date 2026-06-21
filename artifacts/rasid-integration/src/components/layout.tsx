import React from "react";
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
  Building2,
  User,
  Languages,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/use-language";
import { useLogout, getGetCurrentSessionQueryKey, useGetAuthConfig } from "@workspace/api-client-react";

interface NavItem {
  href: string;
  labelKey: string;
  icon: typeof Home;
  slug: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: "/", labelKey: "nav.dashboard", icon: Home, slug: "dashboard" },
  { href: "/import", labelKey: "nav.import", icon: Package, slug: "import" },
  { href: "/dispatch", labelKey: "nav.dispatch", icon: Truck, slug: "dispatch" },
  { href: "/return", labelKey: "nav.return", icon: RotateCcw, slug: "return" },
  { href: "/transfer", labelKey: "nav.transfer", icon: Repeat, slug: "transfer" },
  { href: "/deactivation", labelKey: "nav.deactivation", icon: Ban, slug: "deactivation" },
  { href: "/packages", labelKey: "nav.packages", icon: Box, slug: "packages" },
  { href: "/queries", labelKey: "nav.queries", icon: Search, slug: "queries" },
  { href: "/history", labelKey: "nav.history", icon: History, slug: "history" },
  { href: "/clients", labelKey: "nav.clients", icon: Building2, slug: "clients" },
  { href: "/users", labelKey: "nav.users", icon: Users, slug: "users", adminOnly: true },
  { href: "/settings", labelKey: "nav.settings", icon: Settings, slug: "settings" },
];

const ALWAYS_VISIBLE = new Set(["settings"]);

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const logout = useLogout();
  const { t, dir, lang, setLang } = useLanguage();
  const { data: authConfig } = useGetAuthConfig();

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

  const toggleLang = () => setLang(lang === "ar" ? "en" : "ar");

  const [theme, setTheme] = React.useState<"sky" | "teal">(() => {
    if (typeof window === "undefined") return "sky";
    return (localStorage.getItem("theme") as "sky" | "teal") || "sky";
  });

  const toggleTheme = () => {
    const next = theme === "sky" ? "teal" : "sky";
    setTheme(next);
    localStorage.setItem("theme", next);
    if (next === "teal") {
      document.body.classList.add("theme-teal");
    } else {
      document.body.classList.remove("theme-teal");
    }
  };

  React.useEffect(() => {
    if (theme === "teal") {
      document.body.classList.add("theme-teal");
    } else {
      document.body.classList.remove("theme-teal");
    }
  }, [theme]);

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
              <item.icon className="h-4 w-4 shrink-0" />
              {t(item.labelKey)}
            </div>
          </Link>
        );
      })}
    </nav>
  );

  const LangToggle = () => (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLang}
      className="gap-1.5 text-xs font-semibold px-2 h-8"
      title={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
    >
      <Languages className="h-3.5 w-3.5" />
      {lang === "ar" ? "EN" : "AR"}
    </Button>
  );

  const ThemeToggle = () => (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="w-full gap-1.5 text-xs font-semibold px-2 h-8"
      title={theme === "sky" ? "Teal theme" : "Sky theme"}
    >
      <Palette className="h-3.5 w-3.5" />
      {theme === "sky" ? "Teal" : "Sky"}
    </Button>
  );

  return (
    <div className="flex min-h-screen w-full bg-background font-sans" dir={dir}>
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 border-l bg-card md:flex md:flex-col">
        {/* Sidebar Header: Logo + Lang Toggle */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link href="/">
            <div className="flex items-center gap-2 font-bold text-primary cursor-pointer text-lg">
              <img
                src={`${import.meta.env.BASE_URL}logo.png`}
                alt="Logo"
                className="h-7 w-7 object-contain shrink-0"
              />
              <span>{t("layout.systemNameShort")}</span>
            </div>
          </Link>
          <LangToggle />
        </div>

        {/* Username Banner */}
        {user && (
          <div className="flex items-center gap-2.5 border-b px-4 py-3 bg-muted/40">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{user.username}</p>
              <p className="text-xs text-muted-foreground">
                {user.role === "admin" ? t("layout.admin") : t("layout.client")}
              </p>
              {authConfig?.username && (
                <p className="text-xs text-muted-foreground/70 truncate mt-0.5 font-mono" dir="ltr">
                  {authConfig.username}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <NavLinks />
        </div>

        {/* Theme + Logout */}
        <div className="border-t p-4 space-y-2">
          <ThemeToggle />
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={handleLogout}
            disabled={logout.isPending}
          >
            <LogOut className="h-4 w-4" />
            {t("layout.logout")}
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:hidden">
          <Link href="/">
            <div className="flex items-center gap-2 font-bold text-primary cursor-pointer">
              <img
                src={`${import.meta.env.BASE_URL}logo.png`}
                alt="Logo"
                className="h-6 w-6 object-contain shrink-0"
              />
              <span>{t("layout.systemNameShort")}</span>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            {user && (
              <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground max-w-[80px] truncate">
                  {user.username}
                </span>
                {user.role === "admin" && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                    {t("layout.admin")}
                  </Badge>
                )}
              </div>
            )}
            <LangToggle />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side={dir === "rtl" ? "right" : "left"} className="w-64 p-0 flex flex-col" dir={dir}>
                <div className="flex h-16 items-center justify-between border-b px-4">
                  <span className="font-bold text-primary">{t("layout.menu")}</span>
                  {user && (
                    <div className="text-xs text-muted-foreground">
                      {user.username}
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto">
                  <NavLinks />
                </div>
                <div className="border-t p-4 space-y-2">
                  <ThemeToggle />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={handleLogout}
                    disabled={logout.isPending}
                  >
                    <LogOut className="h-4 w-4" />
                    {t("layout.logout")}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-muted/30">
          <div className="mx-auto max-w-6xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
