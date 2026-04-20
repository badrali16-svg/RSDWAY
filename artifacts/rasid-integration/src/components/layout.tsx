import { Link, useLocation } from "wouter";
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
  Menu
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

const navItems = [
  { href: "/", label: "لوحة القيادة", icon: Home },
  { href: "/import", label: "الاستيراد والتصنيع", icon: Package },
  { href: "/dispatch", label: "الإرسال والاستلام", icon: Truck },
  { href: "/return", label: "الإرجاع والاستهلاك", icon: RotateCcw },
  { href: "/transfer", label: "النقل وصرف الصيدليات", icon: Repeat },
  { href: "/deactivation", label: "التعطيل والتصدير", icon: Ban },
  { href: "/packages", label: "نقل الحزم", icon: Box },
  { href: "/queries", label: "خدمات الاستعلام", icon: Search },
  { href: "/history", label: "سجل العمليات", icon: History },
  { href: "/settings", label: "الإعدادات", icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const NavLinks = () => (
    <nav className="space-y-1 p-4">
      {navItems.map((item) => {
        const isActive = location === item.href;
        return (
          <Link key={item.href} href={item.href}>
            <div
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
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

  return (
    <div className="flex min-h-screen w-full bg-background font-sans" dir="rtl">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 border-l bg-card md:block">
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
            <SheetContent side="right" className="w-64 p-0">
              <div className="flex h-16 items-center border-b px-6">
                <span className="font-bold text-primary">القائمة</span>
              </div>
              <NavLinks />
            </SheetContent>
          </Sheet>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-muted/30">
          <div className="mx-auto max-w-6xl space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
