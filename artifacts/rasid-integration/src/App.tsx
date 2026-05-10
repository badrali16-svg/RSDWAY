import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { LanguageProvider, useLanguage } from "@/lib/language-context";
import { Loader2 } from "lucide-react";

import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Settings from "@/pages/settings";
import UsersPage from "@/pages/users";
import ClientsPage from "@/pages/clients";
import ImportSupplyPage from "@/pages/import-supply";
import DispatchAcceptPage from "@/pages/dispatch-accept";
import ReturnConsumePage from "@/pages/return-consume";
import TransferSalePage from "@/pages/transfer-sale";
import DeactivationExportPage from "@/pages/deactivation-export";
import PackagesPage from "@/pages/packages";
import QueriesPage from "@/pages/queries";
import HistoryPage from "@/pages/history";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function PermissionGuard({ slug, children }: { slug: string; children: React.ReactNode }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  if (!user) return null;
  if (user.role === "admin") return <>{children}</>;
  if (!user.permissions?.includes(slug)) {
    return (
      <div className="rounded-md border bg-card p-8 text-center">
        <p className="text-muted-foreground">{t("common.noPermissionPage")}</p>
      </div>
    );
  }
  return <>{children}</>;
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  if (!user) return null;
  if (user.role !== "admin") {
    return (
      <div className="rounded-md border bg-card p-8 text-center">
        <p className="text-muted-foreground">{t("common.adminOnly")}</p>
      </div>
    );
  }
  return <>{children}</>;
}

function AuthedRoutes() {
  return (
    <Layout>
      <Switch>
        <Route path="/">
          <PermissionGuard slug="dashboard"><Dashboard /></PermissionGuard>
        </Route>
        <Route path="/settings"><Settings /></Route>
        <Route path="/users"><AdminGuard><UsersPage /></AdminGuard></Route>
        <Route path="/import">
          <PermissionGuard slug="import"><ImportSupplyPage /></PermissionGuard>
        </Route>
        <Route path="/dispatch">
          <PermissionGuard slug="dispatch"><DispatchAcceptPage /></PermissionGuard>
        </Route>
        <Route path="/return">
          <PermissionGuard slug="return"><ReturnConsumePage /></PermissionGuard>
        </Route>
        <Route path="/transfer">
          <PermissionGuard slug="transfer"><TransferSalePage /></PermissionGuard>
        </Route>
        <Route path="/deactivation">
          <PermissionGuard slug="deactivation"><DeactivationExportPage /></PermissionGuard>
        </Route>
        <Route path="/packages">
          <PermissionGuard slug="packages"><PackagesPage /></PermissionGuard>
        </Route>
        <Route path="/queries">
          <PermissionGuard slug="queries"><QueriesPage /></PermissionGuard>
        </Route>
        <Route path="/history">
          <PermissionGuard slug="history"><HistoryPage /></PermissionGuard>
        </Route>
        <Route path="/clients">
          <PermissionGuard slug="clients"><ClientsPage /></PermissionGuard>
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function Gate() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <LoginPage />;
  return <AuthedRoutes />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <Gate />
            </AuthProvider>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
