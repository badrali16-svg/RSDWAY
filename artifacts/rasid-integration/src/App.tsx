import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/dashboard";
import Settings from "@/pages/settings";
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

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/settings" component={Settings} />
        <Route path="/import" component={ImportSupplyPage} />
        <Route path="/dispatch" component={DispatchAcceptPage} />
        <Route path="/return" component={ReturnConsumePage} />
        <Route path="/transfer" component={TransferSalePage} />
        <Route path="/deactivation" component={DeactivationExportPage} />
        <Route path="/packages" component={PackagesPage} />
        <Route path="/queries" component={QueriesPage} />
        <Route path="/history" component={HistoryPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
